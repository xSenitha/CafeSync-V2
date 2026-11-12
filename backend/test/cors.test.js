const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const { createCorsOptions, LOCAL_ORIGINS } = require('../src/config/cors');

let server;
let baseUrl;

before(async () => {
  // Run the real Express/CORS middleware against loopback fixtures only. No
  // production startup, database, environment loading, or provider requests.
  const app = express();
  app.use(cors(createCorsOptions({ CORS_ORIGINS: 'https://cafesync.vercel.app, https://cafe.example.com:8443/' })));
  app.get('/fixture', (req, res) => res.json({ success: true }));
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('configured exact frontend origins receive the appropriate CORS response header', async () => {
  for (const origin of ['https://cafesync.vercel.app', 'https://cafe.example.com:8443']) {
    const response = await fetch(`${baseUrl}/fixture`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    assert.deepEqual(await response.json(), { success: true });
  }
});

test('unconfigured domains, lookalike suffixes and other Vercel projects receive no allowed-origin header', async () => {
  for (const origin of [
    'https://unknown.example.com', 'https://cafesync.vercel.app.evil.example',
    'https://another-cafe.vercel.app', 'http://cafesync.vercel.app', 'https://cafesync.vercel.app:444',
  ]) {
    const response = await fetch(`${baseUrl}/fixture`, { headers: { Origin: origin } });
    assert.equal(response.headers.get('access-control-allow-origin'), null, origin);
    await response.json();
  }
});

test('all existing local development origins remain allowed', async () => {
  for (const origin of LOCAL_ORIGINS) {
    const response = await fetch(`${baseUrl}/fixture`, { headers: { Origin: origin } });
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    await response.json();
  }
});

test('local authenticated preflight preserves methods, credentials and Authorization support', async () => {
  const response = await fetch(`${baseUrl}/fixture`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:8082',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Authorization,Content-Type',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:8082');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/i);
  assert.match(response.headers.get('access-control-allow-headers'), /Content-Type/i);
  assert.match(response.headers.get('access-control-allow-methods'), /POST/);
});

test('empty configuration preserves local defaults and canonical origins are deduplicated', () => {
  assert.deepEqual(createCorsOptions({}).origin, [...LOCAL_ORIGINS]);
  assert.deepEqual(createCorsOptions({ CORS_ORIGINS: ' , ' }).origin, [...LOCAL_ORIGINS]);
  const options = createCorsOptions({ CORS_ORIGINS: 'https://cafe.example.com:443/, https://cafe.example.com' });
  assert.deepEqual(options.origin, [...LOCAL_ORIGINS, 'https://cafe.example.com']);
});

test('malformed, wildcard, credential-bearing and non-origin entries are rejected without echoing input', () => {
  for (const origin of [
    '*', 'https://*.vercel.app', '*.vercel.app', 'cafe.example.com', '//cafe.example.com',
    'ftp://cafe.example.com', 'https://cafe.example.com/path',
    'https://name:private-password@cafe.example.com', 'https://@cafe.example.com',
    'https://cafe.example.com?query', 'https://cafe.example.com?',
    'https://cafe.example.com#fragment', 'https://cafe.example.com#',
    'https://cafe.example.com\\', 'https://cafe.exa\nmple.com',
  ]) {
    assert.throws(() => createCorsOptions({ CORS_ORIGINS: origin }), (error) => {
      assert.match(error.message, /CORS_ORIGINS entry 1/);
      assert.equal(error.message.includes('private-password'), false);
      return true;
    }, origin);
  }
});
