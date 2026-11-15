const { createServer } = require('node:http');

const version = '5.0.0-canary.78.test';
const token = 'local-test-session';
const otp = 'local-test-browser-proof';
const requests = [];
const scenario = process.argv[2];
let registry;
let deleted = false;
let archiveDeleted = false;
let loginPolls = 0;
let otpPolls = 0;
let revoked = false;

const packument = () => ({
  _id: 'execution-engine',
  _rev: deleted ? '2-test' : '1-test',
  name: 'execution-engine',
  'dist-tags': { latest: '5.0.0' },
  versions: {
    '5.0.0': { name: 'execution-engine', version: '5.0.0' },
    ...(!deleted
      ? {
          [version]: {
            name: 'execution-engine',
            version,
            dist: { tarball: `${registry}/execution-engine/-/execution-engine-${version}.tgz` }
          }
        }
      : {})
  }
});

const server = createServer(async (req, res) => {
  const path = new URL(req.url, registry).pathname;
  requests.push({ method: req.method, path, otp: req.headers['npm-otp'], authenticated: req.headers.authorization === `Bearer ${token}` });
  let body = '';
  for await (const chunk of req) body += chunk;
  const reply = (status, content, headers = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(content));
  };
  if (path === '/-/v1/login' && req.method === 'POST') {
    return reply(200, { loginUrl: `${registry}/browser/login`, doneUrl: `${registry}/login/done` });
  }
  if (path === '/login/done') {
    if (++loginPolls === 1) return reply(202, {}, { 'retry-after': '0' });
    return reply(200, { token });
  }
  if (path === '/-/whoami') return reply(200, { username: 'tabkram' });
  if (path === '/execution-engine' && req.method === 'GET') return reply(200, packument());
  if (path === '/otp/done') {
    if (++otpPolls === 1) return reply(202, {}, { 'retry-after': '0' });
    return reply(200, { token: otp });
  }
  if (path.startsWith('/execution-engine/-rev/') && req.method === 'PUT') {
    if (scenario === 'policy-denied') return reply(403, { error: 'Unpublish policy denied this removal.' });
    if (scenario === 'false-success') return reply(404, { error: 'Simulated npm false success.' });
    if (req.headers['npm-otp'] !== otp) {
      return reply(
        401,
        { error: 'one-time password required', authUrl: `${registry}/browser/2fa`, doneUrl: `${registry}/otp/done` },
        { 'www-authenticate': 'OTP' }
      );
    }
    const update = JSON.parse(body);
    if (!update.versions['5.0.0'] || update.versions[version]) return reply(400, { error: 'Invalid removal' });
    deleted = true;
    return reply(200, { ok: true });
  }
  if (path.includes('.tgz/-rev/') && req.method === 'DELETE') {
    archiveDeleted = true;
    return reply(200, { ok: true });
  }
  if (path.endsWith('.tgz') && req.method === 'HEAD') return reply(archiveDeleted ? 404 : 200, {});
  if (path === `/-/user/token/${token}` && req.method === 'DELETE') {
    revoked = true;
    return reply(200, { ok: true });
  }
  if (path === '/state') return reply(200, { requests, deleted, archiveDeleted, revoked });
  reply(404, { error: `Unexpected ${req.method} ${path}` });
});

server.listen(0, '127.0.0.1', () => {
  registry = `http://127.0.0.1:${server.address().port}`;
  process.send({ registry, version });
});

process.on('disconnect', () => server.close());
