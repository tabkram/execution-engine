const { appendFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');

const registry = 'https://registry.npmjs.org';
const packageName = 'execution-engine';
const prerelease = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-(canary|dev|beta)(?:\.[0-9A-Za-z-]+)+$/;
const deprecationMessage = 'Obsolete prerelease. Use execution-engine@latest for production.';

function parseVersions(value) {
  const versions = value.split(',').map((version) => version.trim());
  if (versions.some((version) => !prerelease.test(version))) {
    throw new Error('Provide exact canary, dev or beta versions; stable versions, tags and ranges are not allowed.');
  }
  return [...new Set(versions)];
}

async function readPackument(fetchRegistry = fetch) {
  const response = await fetchRegistry(`${registry}/${packageName}?write=true&cleanup_check=${Date.now()}`, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw new Error(`Cannot read npm versions: HTTP ${response.status}.`);
  }
  const packument = await response.json();
  if (!packument.versions || typeof packument.versions !== 'object' || Array.isArray(packument.versions)) {
    throw new Error('The npm registry did not return a versions object.');
  }
  return packument;
}

function selectVersions(packument, { prefix, prNumber, keepVersion } = {}) {
  let matches;
  if (prNumber) {
    if (!/^[1-9]\d*$/.test(prNumber)) {
      throw new Error('The PR number must be a positive integer.');
    }
    const pattern = new RegExp(`^\\d+\\.\\d+\\.\\d+-canary\\.${prNumber}\\.`);
    matches = (version) => pattern.test(version);
  } else {
    if (!/^\d+\.\d+\.\d+-(canary|dev|beta)(?:\.[0-9A-Za-z-]+)*$/.test(prefix || '')) {
      throw new Error('Provide a prerelease prefix or a PR number.');
    }
    matches = (version) => version.startsWith(`${prefix}.`);
  }
  if (keepVersion && (!prerelease.test(keepVersion) || !matches(keepVersion))) {
    throw new Error('The version to preserve must be an exact prerelease belonging to this selection.');
  }
  return Object.keys(packument.versions).filter(
    (version) => prerelease.test(version) && matches(version) && version !== keepVersion && !packument.versions[version].deprecated
  );
}

async function verifyDeprecated(version, message, { read = readPackument, pause = sleep } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const packument = await read();
    if (packument.versions[version]?.deprecated === message) {
      return;
    }
    if (attempt < 2) {
      await pause(2_000);
    }
  }
  throw new Error(`Deprecation of ${version} could not be verified.`);
}

async function deprecateVersions(
  { versions },
  {
    read = readPackument,
    runNpm = (args) => execFileSync('npm', args, { stdio: 'inherit', timeout: 60_000 }),
    verify = verifyDeprecated,
    report = console.error
  } = {}
) {
  const targets = parseVersions(versions);
  const packument = await read();
  const deprecated = [];
  const failed = [];
  for (const version of targets) {
    try {
      if (!Object.hasOwn(packument.versions, version)) {
        throw new Error('Version is not present in the npm registry.');
      }
      if (packument.versions[version].deprecated) continue;
      runNpm([
        'deprecate',
        `${packageName}@${version}`,
        deprecationMessage,
        '--dry-run=false',
        `--registry=${registry}`,
        '--loglevel=http'
      ]);
      await verify(version, deprecationMessage);
      deprecated.push(version);
    } catch (error) {
      report(`Failed to deprecate ${version}: ${error.message}`);
      failed.push(version);
    }
  }
  return { deprecated, failed };
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

async function main(mode) {
  if (mode === 'discover') {
    const versions = selectVersions(await readPackument(), {
      prefix: process.env.VERSION_PREFIX,
      prNumber: process.env.PR_NUMBER,
      keepVersion: process.env.KEEP_VERSION
    });
    output('versions', versions.join(','));
    console.log(`Matching obsolete versions: ${versions.join(', ') || 'none'}`);
  } else if (mode === 'deprecate') {
    const { deprecated, failed } = await deprecateVersions({
      versions: process.env.VERSIONS || ''
    });
    output('DEPRECATED_VERSIONS', deprecated.join(','));
    output('FAILED_VERSIONS', failed.join(','));
    console.log(`Verified deprecated versions: ${deprecated.join(', ') || 'none'}`);
    if (failed.length) {
      throw new Error(`Cleanup failed for ${failed.join(', ')}. Check the npm HTTP logs, token permissions and any required 2FA.`);
    }
  } else {
    throw new Error('Use discover or deprecate.');
  }
}

module.exports = { parseVersions, readPackument, selectVersions, deprecateVersions, verifyDeprecated };

if (require.main === module) {
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
