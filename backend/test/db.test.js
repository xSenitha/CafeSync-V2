const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const { createDBConnector } = require('../src/config/db');
const { createDatabaseMiddleware } = require('../src/middlewares/database.middleware');
const { createCorsOptions } = require('../src/config/cors');

const fixtureUri = 'mongodb://fixture-user:fixture-password@fixture.invalid/cafe';

test('constructing the database connector does not connect or require environment configuration', () => {
  let calls = 0;
  createDBConnector({ mongoose: { connection: { readyState: 0 }, connect: () => { calls += 1; } }, env: {} });
  assert.equal(calls, 0);
});

test('concurrent requests share one in-flight database connection and reuse the ready connection', async () => {
  let calls = 0;
  let finish;
  const database = {
    connection: { readyState: 0 },
    connect: (uri, options) => {
      calls += 1;
      assert.equal(uri, fixtureUri);
      assert.deepEqual(options, { serverSelectionTimeoutMS: 5000 });
      return new Promise((resolve) => { finish = () => { database.connection.readyState = 1; resolve(database); }; });
    },
  };
  const connect = createDBConnector({ mongoose: database, env: { MONGODB_URI: fixtureUri } });
  const requests = [connect(), connect(), connect()];
  assert.equal(requests[0], requests[1]);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish();
  for (const result of await Promise.all(requests)) assert.equal(result, database.connection);
  assert.equal(await connect(), database.connection);
  assert.equal(calls, 1);
});

test('an already-connected database is used without another connect call or URI', async () => {
  let calls = 0;
  const database = { connection: { readyState: 1 }, connect: () => { calls += 1; } };
  const connect = createDBConnector({ mongoose: database, env: {} });
  assert.equal(await connect(), database.connection);
  assert.equal(calls, 0);
});

test('missing URI rejects safely without calling the driver or exiting the process', async () => {
  let calls = 0;
  const connect = createDBConnector({
    mongoose: { connection: { readyState: 0 }, connect: () => { calls += 1; } }, env: {},
  });
  await assert.rejects(connect(), { code: 'DATABASE_NOT_CONFIGURED', message: 'Database is not configured.' });
  assert.equal(calls, 0);
});

test('failed asynchronous and synchronous connection attempts can retry without leaking driver details', async () => {
  for (const synchronous of [false, true]) {
    let calls = 0;
    const database = {
      connection: { readyState: 0 },
      connect: () => {
        calls += 1;
        if (calls === 1) {
          const error = new Error(`Private driver error for ${fixtureUri}`);
          if (synchronous) throw error;
          return Promise.reject(error);
        }
        database.connection.readyState = 1;
        return Promise.resolve(database);
      },
    };
    const connect = createDBConnector({ mongoose: database, env: { MONGODB_URI: fixtureUri } });
    await assert.rejects(connect(), (error) => {
      assert.equal(error.code, 'DATABASE_UNAVAILABLE');
      assert.equal(error.message, 'Database connection is unavailable.');
      assert.equal(error.stack.includes('fixture-password'), false);
      return true;
    });
    assert.equal(await connect(), database.connection);
    assert.equal(calls, 2);
  }
});

test('a disconnected warm instance reconnects instead of returning a stale connection', async () => {
  let calls = 0;
  const database = {
    connection: { readyState: 0 },
    connect: async () => { calls += 1; database.connection.readyState = 1; return database; },
  };
  const connect = createDBConnector({ mongoose: database, env: { MONGODB_URI: fixtureUri } });
  await connect();
  database.connection.readyState = 0;
  await connect();
  assert.equal(calls, 2);
});

test('API readiness returns a safe 503 and retries successfully while CORS preflight avoids the database', async () => {
  let calls = 0;
  const logs = [];
  const app = express();
  app.use(cors(createCorsOptions({})));
  app.use('/api', createDatabaseMiddleware({
    connect: async () => {
      calls += 1;
      if (calls === 1) throw new Error(`Private connection error ${fixtureUri}`);
    },
    logger: (...args) => logs.push(args),
  }));
  app.get('/api/fixture', (req, res) => res.json({ success: true }));
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  const endpoint = `http://127.0.0.1:${server.address().port}/api/fixture`;
  try {
    const preflight = await fetch(endpoint, { method: 'OPTIONS', headers: {
      Origin: 'http://localhost:8082', 'Access-Control-Request-Method': 'GET',
    } });
    assert.equal(preflight.status, 204);
    assert.equal(calls, 0);
    const unavailable = await fetch(endpoint, { headers: { Origin: 'http://localhost:8082' } });
    assert.equal(unavailable.status, 503);
    const body = await unavailable.json();
    assert.deepEqual(body, { success: false, error: 'The service is temporarily unavailable. Please try again shortly.' });
    assert.equal(unavailable.headers.get('access-control-allow-origin'), 'http://localhost:8082');
    assert.deepEqual(logs, [['[CafeSync database]', { code: 'database_unavailable' }]]);
    assert.equal(JSON.stringify({ body, logs }).includes('fixture-password'), false);
    const ready = await fetch(endpoint);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { success: true });
    assert.equal(calls, 2);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
