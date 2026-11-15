const assert = require('node:assert/strict');
const { fork, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { unpublishManually, verifyRemoved, cleanupSession, runNpm, sessionOptions } = require('./manual-unpublish.cjs');

const first = '5.0.0-canary.78.test';
const second = '5.0.0-beta.1';
const confirm = 'I confirm to unpublish';
const pack = (...versions) => ({ versions: Object.fromEntries(versions.map((version) => [version, {}])) });

function temporarySession(t) {
  const root = mkdtempSync(join(tmpdir(), 'manual-npm-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, directory: join(root, 'session') };
}

function fakeLogin(args, directory) {
  if (args[0] === 'login') writeFileSync(join(directory, '.npmrc'), '//registry.npmjs.org/:_authToken=local-test-session\n');
  if (args[0] === 'whoami') return 'tabkram\n';
}

test('rejects unsafe targets, missing confirmation and registry failures before authentication', async (t) => {
  const { directory } = temporarySession(t);
  const run = () => assert.fail('Must not authenticate or mutate npm.');
  for (const input of [
    { versions: `${first},5.0.0`, confirm },
    { versions: '*', confirm },
    { versions: first, confirm: 'no' },
    { versions: `${first},${second}`, confirm }
  ]) {
    await assert.rejects(unpublishManually({ ...input, directory }, { read: async () => pack(first), run }));
    assert.equal(existsSync(directory), false);
  }
  await assert.rejects(
    unpublishManually(
      { versions: first, confirm, directory },
      {
        run,
        read: async () => {
          throw new Error('registry unavailable');
        }
      }
    ),
    /registry unavailable/
  );
});

test('deletes only exact selected versions through a terminal and verifies each removal', async (t) => {
  const { directory } = temporarySession(t);
  const calls = [];
  const verified = [];
  const removed = await unpublishManually(
    { versions: `${first},${second},${first}`, confirm, directory },
    {
      read: async () => pack(first, second, '5.0.0', '5.0.0-canary.79.other'),
      run: (args, dir, options) => {
        calls.push({ args, options });
        assert.equal(dir, directory);
        return fakeLogin(args, dir);
      },
      verify: async (version) => verified.push(version),
      report: () => {}
    }
  );
  assert.deepEqual(removed, [first, second]);
  assert.deepEqual(verified, [first, second]);
  const deletions = calls.filter(({ args }) => args[0] === 'unpublish');
  assert.deepEqual(
    deletions.map(({ args }) => args[1]),
    [first, second].map((v) => `execution-engine@${v}`)
  );
  for (const { args, options } of deletions) {
    assert.equal(options.terminal, true);
    assert(args.includes('--browser=false'));
    assert(args.includes('--dry-run=false'));
    assert(args.includes('--registry=https://registry.npmjs.org'));
    assert(!args.includes('--force'));
  }
  assert.equal(calls.at(-1).args[0], 'logout');
  assert.equal(existsSync(directory), false);
});

test('a different npm account cannot delete versions and its session is revoked', async (t) => {
  const { directory } = temporarySession(t);
  const commands = [];
  await assert.rejects(
    unpublishManually(
      { versions: first, confirm, directory },
      {
        read: async () => pack(first),
        run: (args, dir) => {
          commands.push(args[0]);
          fakeLogin(args, dir);
          if (args[0] === 'whoami') return 'another-user\n';
        },
        report: () => {}
      }
    ),
    /Expected npm account tabkram/
  );
  assert.deepEqual(commands, ['login', 'whoami', 'logout']);
  assert.equal(existsSync(directory), false);
});

test('failed login, deletion or verification stops without deprecation and cleans up', async (t) => {
  for (const failure of ['login', 'unpublish', 'verify']) {
    const { directory } = temporarySession(t);
    const commands = [];
    await assert.rejects(
      unpublishManually(
        { versions: `${first},${second}`, confirm, directory },
        {
          read: async () => pack(first, second),
          run: (args, dir) => {
            commands.push(args[0]);
            const result = fakeLogin(args, dir);
            if (args[0] === failure) throw new Error('test failure');
            return result;
          },
          verify: async () => {
            if (failure === 'verify') throw new Error('test failure');
          },
          report: () => {}
        }
      ),
      /test failure/
    );
    assert(!commands.includes('deprecate'));
    assert.equal(commands.filter((command) => command === 'unpublish').length, failure === 'login' ? 0 : 1);
    assert.equal(commands.at(-1), 'logout');
    assert.equal(existsSync(directory), false);
  }
});

test('failed revocation is visible while temporary credentials are still deleted', async (t) => {
  const { directory } = temporarySession(t);
  await assert.rejects(
    unpublishManually(
      { versions: first, confirm, directory },
      {
        read: async () => pack(first),
        run: (args, dir) => {
          if (args[0] === 'logout') throw new Error('revocation failed');
          return fakeLogin(args, dir);
        },
        verify: async () => {},
        report: () => {}
      }
    ),
    /revocation failed/
  );
  assert.equal(existsSync(directory), false);
  cleanupSession(directory, () => assert.fail('Cleanup of an absent session is a no-op.'));
});

test('isolates npm configuration and removes inherited token and OTP settings', (t) => {
  const { directory } = temporarySession(t);
  const values = { NODE_AUTH_TOKEN: 'unused', NPM_TOKEN: 'unused', npm_config_otp: 'unused', NPM_CONFIG_DRY_RUN: 'true' };
  for (const [key, value] of Object.entries(values)) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
    });
  }
  const options = sessionOptions(directory);
  assert.equal(options.cwd, directory);
  for (const key of Object.keys(values)) assert.equal(options.env[key], undefined);
  assert.equal(options.env.NPM_CONFIG_USERCONFIG, join(directory, '.npmrc'));
  assert.equal(options.env.NPM_CONFIG_GLOBALCONFIG, join(directory, 'global.npmrc'));
  assert.equal(options.env.NPM_CONFIG_CACHE, join(directory, 'cache'));
});

test('requires metadata disappearance and an unavailable archive, allowing propagation', async () => {
  for (const status of [404, 410]) {
    let reads = 0;
    let pauses = 0;
    await verifyRemoved(first, {
      read: async () => (++reads === 1 ? pack(first) : pack('5.0.0')),
      fetchRegistry: async (url, options) => {
        assert(url.startsWith(`https://registry.npmjs.org/execution-engine/-/execution-engine-${first}.tgz?cleanup_check=`));
        assert.equal(options.method, 'HEAD');
        assert.equal(options.cache, 'no-store');
        return new Response('', { status });
      },
      pause: async () => {
        pauses++;
      }
    });
    assert.equal(reads, 2);
    assert.equal(pauses, 1);
  }
});

test('a success line, remaining archive, network error or HTTP error never counts as removal', async () => {
  for (const status of [200, 403, 500]) {
    await assert.rejects(
      verifyRemoved(first, {
        read: async () => pack(),
        fetchRegistry: async () => new Response('', { status }),
        pause: async () => {}
      })
    );
  }
  await assert.rejects(
    verifyRemoved(first, {
      read: async () => pack(first),
      fetchRegistry: () => assert.fail('Metadata must disappear first.'),
      pause: async () => {}
    }),
    /Removal was not verified/
  );
  await assert.rejects(
    verifyRemoved(first, {
      read: async () => {
        throw new Error('network failed');
      }
    }),
    /network failed/
  );
});

test('CLI failure summary includes only removals verified before the failure', (t) => {
  const { root } = temporarySession(t);
  const preload = join(root, 'preload.cjs');
  const output = join(root, 'outputs');
  const summary = join(root, 'summary');
  writeFileSync(
    preload,
    `
    const fs = require('node:fs');
    require('node:timers/promises').setTimeout = async () => {};
    let deleted = false;
    require('node:child_process').execFileSync = (command, args, options) => {
      if (args[0] === 'login') fs.writeFileSync(options.env.NPM_CONFIG_USERCONFIG, '//registry.npmjs.org/:_authToken=local-test-session');
      if (args[0] === 'whoami') return 'tabkram';
      if (command === 'python3') {
        if (args[2].endsWith('${second}')) throw new Error('npm policy denied');
        deleted = true;
      }
    };
    global.fetch = async (url, options) => options.method === 'HEAD'
      ? new Response('', { status: 404 })
      : Response.json({ versions: { '${second}': {}, ...(!deleted ? { '${first}': {} } : {}) } });
  `
  );
  const result = spawnSync(process.execPath, ['--require', preload, join(__dirname, 'manual-unpublish.cjs'), 'unpublish'], {
    env: {
      ...process.env,
      RUNNER_TEMP: root,
      VERSIONS: `${first},${second}`,
      CONFIRM: confirm,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary
    },
    encoding: 'utf8'
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm policy denied/);
  assert.equal(readFileSync(output, 'utf8'), `UNPUBLISHED_VERSIONS=${first}\n`);
  assert.equal(readFileSync(summary, 'utf8'), `Verified removed versions: ${first}.\n`);
  assert.equal(existsSync(join(root, 'manual-npm-unpublish')), false);
});

for (const scenario of ['success', 'no-terminal', 'policy-denied', 'false-success']) {
  test(`real npm browser authentication and deletion: ${scenario}`, { timeout: 30_000 }, async (t) => {
    const { directory } = temporarySession(t);
    const fixture = fork(join(__dirname, 'fixtures/manual-npm-registry.cjs'), [scenario], {
      stdio: ['ignore', 'ignore', 'inherit', 'ipc']
    });
    t.after(() => fixture.kill());
    const [{ registry, version }] = await once(fixture, 'message');
    const read = async () => (await fetch(`${registry}/execution-engine?write=true`)).json();
    const run = (args, dir, options = {}) => {
      const rewritten = args.map((arg) => (arg.startsWith('--registry=') ? `--registry=${registry}` : arg));
      assert.equal(statSync(dir).mode & 0o777, 0o700);
      assert.equal(statSync(join(dir, '.npmrc')).mode & 0o777, 0o600);
      return runNpm(
        rewritten,
        dir,
        args[0] === 'unpublish' && scenario !== 'success' ? { ...options, terminal: scenario !== 'no-terminal', quiet: true } : options
      );
    };
    const operation = unpublishManually(
      { versions: version, confirm, directory },
      {
        read,
        run,
        verify: (target) =>
          verifyRemoved(target, {
            read,
            fetchRegistry: (url, options) => fetch(url.replace('https://registry.npmjs.org', registry), options),
            pause: async () => {}
          }),
        report: () => {}
      }
    );
    if (scenario === 'success') assert.deepEqual(await operation, [version]);
    else await assert.rejects(operation, scenario === 'false-success' ? /Removal was not verified/ : /Command failed/);
    const state = await (await fetch(`${registry}/state`)).json();
    assert.equal(state.deleted, scenario === 'success');
    assert.equal(state.archiveDeleted, scenario === 'success');
    assert.equal(state.revoked, true);
    const puts = state.requests.filter((r) => r.method === 'PUT');
    assert.equal(puts.length, scenario === 'success' ? 2 : 1);
    assert(puts.every((r) => r.authenticated));
    if (scenario === 'success') {
      assert(state.requests.filter((r) => r.path === '/otp/done').length >= 2);
      assert.equal(puts[0].otp, undefined);
      assert.equal(puts[1].otp, 'local-test-browser-proof');
    } else assert(!state.requests.some((r) => r.path === '/otp/done'));
    assert(!state.requests.some((r) => r.method === 'DELETE' && r.path.startsWith('/execution-engine/-rev/')));
    assert.equal(existsSync(directory), false);
  });
}
