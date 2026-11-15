const { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');
const { parseVersions, readPackument } = require('./canary-cleanup.cjs');

const registry = 'https://registry.npmjs.org';
const packageName = 'execution-engine';
const owner = 'tabkram';
const confirmation = 'I confirm to unpublish';

function sessionOptions(directory) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key) && !['NODE_AUTH_TOKEN', 'NPM_TOKEN'].includes(key))
  );
  return {
    cwd: directory,
    env: {
      ...env,
      NPM_CONFIG_USERCONFIG: join(directory, '.npmrc'),
      NPM_CONFIG_GLOBALCONFIG: join(directory, 'global.npmrc'),
      NPM_CONFIG_CACHE: join(directory, 'cache'),
      NPM_CONFIG_UPDATE_NOTIFIER: 'false',
      NPM_CONFIG_FETCH_RETRIES: '0'
    }
  };
}

function runNpm(args, directory, { terminal = false, capture = false, quiet = false } = {}) {
  return execFileSync(terminal ? 'python3' : 'npm', terminal ? [join(__dirname, 'npm-with-tty.py'), ...args] : args, {
    ...sessionOptions(directory),
    stdio: quiet ? 'ignore' : capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    timeout: 300_000
  });
}

async function verifyRemoved(version, { read = readPackument, fetchRegistry = fetch, pause = sleep } = {}) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const packument = await read();
    if (!Object.hasOwn(packument.versions, version)) {
      const response = await fetchRegistry(`${registry}/${packageName}/-/${packageName}-${version}.tgz?cleanup_check=${Date.now()}`, {
        method: 'HEAD',
        headers: { 'cache-control': 'no-cache' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000)
      });
      if (response.status === 404 || response.status === 410) return;
      if (!response.ok) throw new Error(`Cannot verify the archive for ${version}: HTTP ${response.status}.`);
    }
    if (attempt < 9) await pause(3_000);
  }
  throw new Error(`${version} is still listed or its archive is still downloadable. Removal was not verified.`);
}

function cleanupSession(directory, run = runNpm) {
  if (!existsSync(directory)) return;
  try {
    const config = join(directory, '.npmrc');
    if (existsSync(config) && readFileSync(config, 'utf8').trim()) {
      try {
        run(['logout', `--registry=${registry}`, '--loglevel=error'], directory, { quiet: true });
      } catch {
        throw new Error('npm session revocation failed. Revoke the temporary session from your npm account.');
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function unpublishManually(
  { versions, confirm, directory },
  { read = readPackument, run = runNpm, verify = verifyRemoved, report = console.log, recordRemoval = () => {} } = {}
) {
  const targets = parseVersions(versions);
  if (confirm !== confirmation) throw new Error(`Type exactly: ${confirmation}.`);
  const packument = await read();
  for (const version of targets) {
    if (!Object.hasOwn(packument.versions, version)) throw new Error(`${version} is not present in the npm registry.`);
  }
  mkdirSync(directory, { mode: 0o700 });
  writeFileSync(join(directory, '.npmrc'), '', { mode: 0o600 });
  writeFileSync(join(directory, 'global.npmrc'), '', { mode: 0o600 });
  const removed = [];
  try {
    report('Open the npm login link below in your browser and authenticate as tabkram.');
    run(['login', '--auth-type=web', '--browser=false', `--registry=${registry}`, '--loglevel=error'], directory);
    const username = run(['whoami', `--registry=${registry}`, '--loglevel=error'], directory, { capture: true }).trim();
    if (username !== owner) throw new Error(`Expected npm account ${owner}; authenticated as ${username}. No versions were deleted.`);
    for (const version of targets) {
      report(`Deleting ${packageName}@${version}. Open each npm authentication link and complete its 2FA challenge.`);
      run(
        ['unpublish', `${packageName}@${version}`, '--dry-run=false', '--browser=false', `--registry=${registry}`, '--loglevel=error'],
        directory,
        { terminal: true }
      );
      await verify(version);
      removed.push(version);
      recordRemoval(version);
      report(`Verified removed: ${version}`);
    }
    return removed;
  } finally {
    cleanupSession(directory, run);
  }
}

async function main(mode) {
  if (!process.env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required for the isolated npm session.');
  const directory = join(process.env.RUNNER_TEMP, 'manual-npm-unpublish');
  if (mode === 'cleanup') cleanupSession(directory);
  else if (mode === 'unpublish') {
    const removed = [];
    try {
      await unpublishManually(
        { versions: process.env.VERSIONS || '', confirm: process.env.CONFIRM, directory },
        { recordRemoval: (version) => removed.push(version) }
      );
    } finally {
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `UNPUBLISHED_VERSIONS=${removed.join(',')}\n`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Verified removed versions: ${removed.join(', ') || 'none'}.\n`);
      }
    }
  } else throw new Error('Use unpublish or cleanup.');
}

module.exports = { unpublishManually, verifyRemoved, cleanupSession, runNpm, sessionOptions };

if (require.main === module) {
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
