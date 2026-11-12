const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const environment = require('../src/config/env');

test('direct app import loads environment and health reports database readiness without caching failures', async (t) => {
  const originalUri = process.env.MONGODB_URI;
  const originalOrigins = process.env.CORS_ORIGINS;
  const fixtureUri = 'mongodb://fixture-user:fixture-password@fixture.invalid/cafe';
  const origin = 'https://health-fixture.example';
  let environmentLoads = 0;
  let connections = 0;
  let server;

  // Stub the loader before importing the same entry point used by Vercel.
  // This must neither read the real .env nor connect to a real database.
  t.mock.method(environment, 'loadEnv', () => {
    environmentLoads += 1;
    process.env.MONGODB_URI = fixtureUri;
    process.env.CORS_ORIGINS = origin;
  });
  t.mock.method(mongoose, 'connect', async (uri) => {
    assert.equal(uri, fixtureUri);
    connections += 1;
    if (connections === 1) throw new Error(`Private driver error for ${fixtureUri}`);
    return mongoose;
  });
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});

  try {
    const app = require('../src/app');
    assert.equal(environmentLoads, 1);
    assert.equal(connections, 0);
    server = await new Promise((resolve, reject) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
      instance.once('error', reject);
    });
    const endpoint = `http://127.0.0.1:${server.address().port}/api/health`;

    const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'GET',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal(connections, 0);

    const unavailable = await fetch(endpoint, { headers: { Origin: origin } });
    assert.equal(unavailable.status, 503);
    assert.equal(unavailable.headers.get('cache-control'), 'no-store');
    assert.equal(unavailable.headers.get('access-control-allow-origin'), origin);
    assert.deepEqual(await unavailable.json(), {
      success: false, error: 'The service is temporarily unavailable. Please try again shortly.',
    });

    const ready = await fetch(endpoint, { headers: { Origin: origin } });
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get('cache-control'), 'no-store');
    assert.equal(ready.headers.get('access-control-allow-origin'), origin);
    assert.deepEqual(await ready.json(), { success: true, status: 'ok', database: 'connected' });
    assert.equal(connections, 2);
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (originalUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = originalUri;
    if (originalOrigins === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = originalOrigins;
  }
});
