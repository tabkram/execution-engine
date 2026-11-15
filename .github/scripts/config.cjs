const { name: packageName } = require('../../package.json');

const nodeVersion = '24';
const npmVersion = '11';
const registry = 'https://registry.npmjs.org';
const registryTimeoutMs = 15_000;
const packageUrl = `https://www.npmjs.com/package/${packageName}`;
const publishAccess = 'public';
const tags = { latest: 'latest', prerelease: 'next', canary: 'canary' };
const prerelease = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-(canary|dev|beta)(?:\.[0-9A-Za-z-]+)+$/;
const prereleasePrefix = /^\d+\.\d+\.\d+-(canary|dev|beta)(?:\.[0-9A-Za-z-]+)*$/;
const deprecationMessage = `Obsolete prerelease. Use ${packageName}@${tags.latest} for production.`;
const npmUser = 'tabkram';
const unpublishConfirmation = 'I confirm to unpublish';

module.exports = {
  nodeVersion,
  npmVersion,
  registry,
  registryTimeoutMs,
  packageName,
  packageUrl,
  publishAccess,
  tags,
  prerelease,
  prereleasePrefix,
  deprecationMessage,
  npmUser,
  unpublishConfirmation
};
