const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');

const { parseVersions, readPackument, selectVersions, deprecateVersions, verifyDeprecated } = require('./canary-cleanup.cjs');

const first = '5.0.0-canary.76.first';
const current = '5.0.0-canary.76.current';
const message = 'Obsolete prerelease. Use execution-engine@latest for production.';
const pack = (...versions) => ({ versions: Object.fromEntries(versions.map((version) => [version, {}])) });

test('validates the entire batch and registry access before running npm', async () => {
  const runNpm = () => assert.fail('npm must not run');
  await assert.rejects(deprecateVersions({ versions: `${first},5.0.0` }, { runNpm }));
  await assert.rejects(
    deprecateVersions(
      { versions: first },
      {
        runNpm,
        read: async () => {
          throw new Error('registry unavailable');
        }
      }
    ),
    /registry unavailable/
  );
});

test('deprecates exact prereleases directly and counts only verified deprecations', async () => {
  const commands = [];
  const verified = [];
  const result = await deprecateVersions(
    { versions: `${first},${current},${first}` },
    {
      read: async () => pack(first, current),
      runNpm: (args) => commands.push(args),
      verify: async (...args) => verified.push(args)
    }
  );
  assert.deepEqual(
    commands,
    [first, current].map((version) => [
      'deprecate',
      `execution-engine@${version}`,
      message,
      '--dry-run=false',
      '--registry=https://registry.npmjs.org',
      '--loglevel=http'
    ])
  );
  assert.deepEqual(verified, [
    [first, message],
    [current, message]
  ]);
  assert.deepEqual(result, { deprecated: [first, current], failed: [] });
});

test('already deprecated versions succeed without another npm write', async () => {
  const result = await deprecateVersions(
    { versions: first },
    {
      read: async () => ({ versions: { [first]: { deprecated: message } } }),
      runNpm: () => assert.fail('Already deprecated versions need no write.'),
      verify: () => assert.fail('Fresh registry metadata already verifies the message.')
    }
  );
  assert.deepEqual(result, { deprecated: [first], failed: [] });
});

test('missing versions fail without issuing npm commands', async () => {
  const result = await deprecateVersions(
    { versions: first },
    {
      read: async () => pack(),
      runNpm: () => assert.fail('Cannot deprecate an absent version.'),
      report: () => {}
    }
  );
  assert.deepEqual(result, { deprecated: [], failed: [first] });
});

test('continues after failed commands or verification and reports only verified successes', async () => {
  const beta = '5.0.0-beta.1';
  const commands = [];
  const result = await deprecateVersions(
    { versions: `${first},${current},${beta}` },
    {
      read: async () => pack(first, current, beta),
      runNpm: (args) => {
        commands.push(args[1]);
        if (args[1] === `execution-engine@${first}`) throw new Error('E403');
      },
      verify: async (version) => {
        if (version === current) throw new Error('deprecation not visible');
      },
      report: () => {}
    }
  );
  assert.deepEqual(
    commands,
    [first, current, beta].map((version) => `execution-engine@${version}`)
  );
  assert.deepEqual(result, { deprecated: [beta], failed: [first, current] });
});

test('verifies the exact deprecation message and allows bounded registry propagation', async () => {
  let reads = 0;
  let pauses = 0;
  await verifyDeprecated(first, message, {
    read: async () => ({ versions: { [first]: { deprecated: ++reads === 1 ? 'Another message' : message } } }),
    pause: async () => {
      pauses++;
    }
  });
  assert.equal(reads, 2);
  assert.equal(pauses, 1);
  for (const metadata of [pack(first), pack()]) {
    await assert.rejects(verifyDeprecated(first, message, { read: async () => metadata, pause: async () => {} }), /could not be verified/);
  }
  await assert.rejects(
    verifyDeprecated(first, message, {
      read: async () => {
        throw new Error('network failed');
      }
    }),
    /network failed/
  );
});

test('CLI fails for false npm success and reports only verified deprecations', () => {
  const directory = mkdtempSync(join(tmpdir(), 'canary-cleanup-'));
  try {
    const preload = join(directory, 'registry.cjs');
    const output = join(directory, 'outputs');
    writeFileSync(
      preload,
      `
      require('node:timers/promises').setTimeout = async () => {};
      require('node:child_process').execFileSync = () => {};
      global.fetch = async () => Response.json({ versions: { '${first}': {} } });
    `
    );
    const result = spawnSync(process.execPath, ['--require', preload, join(__dirname, 'canary-cleanup.cjs'), 'deprecate'], {
      env: { ...process.env, VERSIONS: first, GITHUB_OUTPUT: output },
      encoding: 'utf8'
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /could not be verified/);
    assert.equal(readFileSync(output, 'utf8'), `DEPRECATED_VERSIONS=\nFAILED_VERSIONS=${first}\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI succeeds after direct deprecation without ever attempting deletion', () => {
  const directory = mkdtempSync(join(tmpdir(), 'canary-cleanup-'));
  try {
    const preload = join(directory, 'registry.cjs');
    const output = join(directory, 'outputs');
    writeFileSync(
      preload,
      `
      let message;
      require('node:child_process').execFileSync = (command, args) => {
        if (command !== 'npm' || args[0] !== 'deprecate') throw new Error('Unexpected deletion');
        message = args[2];
      };
      global.fetch = async () => Response.json({ versions: { '${first}': { deprecated: message } } });
    `
    );
    const result = spawnSync(process.execPath, ['--require', preload, join(__dirname, 'canary-cleanup.cjs'), 'deprecate'], {
      env: { ...process.env, VERSIONS: first, GITHUB_OUTPUT: output },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), `DEPRECATED_VERSIONS=${first}\nFAILED_VERSIONS=\n`);
    assert.match(result.stdout, /Verified deprecated versions/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('finds all canaries for a closed PR, including untagged and older base versions', () => {
  const registry = {
    ...pack(
      '5.0.0',
      first,
      current,
      '4.0.0-canary.76.old',
      '5.0.0-canary.760.other',
      '5.0.0-canary.77.other',
      '5.0.0-dev.other-canary.76.hash'
    ),
    'dist-tags': { latest: '5.0.0', canary: current }
  };
  assert.deepEqual(selectVersions(registry, { prNumber: '76' }), [first, current, '4.0.0-canary.76.old']);
});

test('prefix selection treats dots literally and does not match a different PR number', () => {
  assert.deepEqual(
    selectVersions(pack(first, '5.0.0-canary.760.hash', '5.0.0-beta.76.hash'), {
      prefix: '5.0.0-canary.76'
    }),
    [first]
  );
});

test('redeployment retires only this PR previous canaries and preserves the newly published version', () => {
  const registry = pack('5.0.0', first, current, '4.0.0-canary.76.old', '5.0.0-canary.77.other');
  assert.deepEqual(selectVersions(registry, { prNumber: '76', keepVersion: current }), [first, '4.0.0-canary.76.old']);
  // npm metadata may not show the successful publication yet; exclusion must not require its presence.
  assert.deepEqual(selectVersions(pack(first), { prNumber: '76', keepVersion: current }), [first]);
  assert.throws(() => selectVersions(registry, { prNumber: '76', keepVersion: '5.0.0' }));
  assert.throws(() => selectVersions(registry, { prNumber: '76', keepVersion: '5.0.0-canary.77.other' }));
});

test('requires a bounded cleanup selector', () => {
  for (const options of [{}, { prefix: '' }, { prefix: '5' }, { prNumber: '.*' }, { prNumber: '0' }]) {
    assert.throws(() => selectVersions(pack(first), options));
  }
});

test('accepts exact prereleases, removes duplicates and rejects the whole batch if any target is unsafe', () => {
  assert.deepEqual(parseVersions(` ${first},${first},5.0.0-beta.1,5.0.0-dev.2 `), [first, '5.0.0-beta.1', '5.0.0-dev.2']);
  for (const value of [
    '',
    '5.0.0',
    'latest',
    '*',
    '^5.0.0-beta.1',
    '5.0.0-notbeta.1',
    `${first},5.0.0`,
    `${first},`,
    `${first}\nBAD=value`,
    '5.0.0-canary.76.$(echo danger)'
  ]) {
    assert.throws(() => parseVersions(value));
  }
});

test('fetches fresh public metadata and rejects errors or invalid registry responses', async () => {
  const result = await readPackument(async (url, options) => {
    assert.ok(url.startsWith('https://registry.npmjs.org/execution-engine?write=true&cleanup_check='));
    assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['cache-control'], 'no-cache');
    return Response.json(pack(first));
  });
  assert.deepEqual(result, pack(first));
  await assert.rejects(
    readPackument(async () => new Response('', { status: 503 })),
    /HTTP 503/
  );
  await assert.rejects(
    readPackument(async () => Response.json({})),
    /versions object/
  );
  await assert.rejects(
    readPackument(async () => Response.json({ versions: [] })),
    /versions object/
  );
});

test('discovery CLI lists every matching version without a trailing comma', () => {
  const directory = mkdtempSync(join(tmpdir(), 'canary-cleanup-'));
  try {
    const preload = join(directory, 'registry.cjs');
    const output = join(directory, 'outputs');
    writeFileSync(output, '');
    writeFileSync(
      preload,
      `global.fetch = async () => Response.json({ versions: {
      '${first}': {}, '${current}': {}, '5.0.0-canary.77.other': {}, '5.0.0': {}
    }});`
    );
    const result = spawnSync(process.execPath, ['--require', preload, join(__dirname, 'canary-cleanup.cjs'), 'discover'], {
      env: { ...process.env, PR_NUMBER: '76', GITHUB_OUTPUT: output },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), `versions=${first},${current}\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('discovery CLI excludes the deployed version before attempting retirement', () => {
  const directory = mkdtempSync(join(tmpdir(), 'canary-cleanup-'));
  try {
    const preload = join(directory, 'registry.cjs');
    const output = join(directory, 'outputs');
    writeFileSync(output, '');
    writeFileSync(
      preload,
      `global.fetch = async () => Response.json({ versions: {
      '${first}': {}, '${current}': {}, '5.0.0-canary.77.other': {}
    }});`
    );
    const result = spawnSync(process.execPath, ['--require', preload, join(__dirname, 'canary-cleanup.cjs'), 'discover'], {
      env: { ...process.env, PR_NUMBER: '76', KEEP_VERSION: current, GITHUB_OUTPUT: output },
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(output, 'utf8'), `versions=${first}\n`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
