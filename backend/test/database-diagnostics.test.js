const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mongo } = require('mongoose');
const { createDBConnector } = require('../src/config/db');
const { createDatabaseMiddleware } = require('../src/middlewares/database.middleware');
const { classifyDatabaseFailure, logDatabaseFailure } = require('../src/config/database-diagnostics');

const privateUri = 'mongodb://private-user:private-password@private-host.invalid/cafe';
const failure = (properties) => Object.assign(new Error(`Private driver details: ${privateUri}`), properties);
const selectionFailure = (error) => failure({
  name: 'MongooseServerSelectionError',
  reason: { servers: new Map([['private-host.invalid', { error }]]) },
});

test('database diagnostics distinguish driver failures including nested topology and socket causes', () => {
  const examples = [
    [failure({ code: 'DATABASE_NOT_CONFIGURED' }), 'database_not_configured'],
    [new mongo.MongoParseError(`Invalid connection string: ${privateUri}`), 'database_invalid_configuration'],
    [new mongo.MongoServerError({ message: privateUri, code: 18 }), 'database_authentication_failed'],
    [new mongo.MongoServerError({ message: `bad auth ${privateUri}`, code: 8000 }), 'database_authentication_failed'],
    [failure({ code: 'ENOTFOUND' }), 'database_dns_error'],
    [failure({ code: 'ECONNREFUSED', syscall: 'querySrv' }), 'database_dns_error'],
    [selectionFailure(new mongo.MongoNetworkError(privateUri, {
      cause: failure({ code: 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR' }),
    })), 'database_tls_error'],
    [selectionFailure(failure({ code: 'ECONNREFUSED' })), 'database_network_error'],
    [selectionFailure(null), 'database_timeout'],
    [failure({ code: 'ETIMEDOUT' }), 'database_timeout'],
    [new mongo.MongoNetworkError(privateUri), 'database_network_error'],
    [failure({ code: privateUri, diagnostic: privateUri }), 'database_unavailable'],
    [null, 'database_unavailable'],
  ];
  for (const [error, expected] of examples) assert.equal(classifyDatabaseFailure(error), expected);

  const cyclic = failure({});
  cyclic.cause = cyclic;
  cyclic.reason = { errors: [cyclic, failure({ code: 'ENODATA' })] };
  assert.equal(classifyDatabaseFailure(cyclic), 'database_dns_error');
});

test('connector preserves a safe failure category without retaining raw driver errors', async () => {
  const connect = createDBConnector({
    mongoose: { connection: { readyState: 0 }, connect: async () => {
      throw selectionFailure(failure({ code: 'CERT_HAS_EXPIRED' }));
    } },
    env: { MONGODB_URI: privateUri },
  });
  await assert.rejects(connect(), (error) => {
    assert.equal(error.code, 'DATABASE_UNAVAILABLE');
    assert.equal(error.diagnostic, 'database_tls_error');
    assert.equal(classifyDatabaseFailure(error), 'database_tls_error');
    assert.equal(error.cause, undefined);
    assert.equal(error.stack.includes('private-password'), false);
    assert.equal(JSON.stringify(error).includes('private-host'), false);
    return true;
  });
});

test('API failures log safe categories while public responses remain generic', async () => {
  for (const [env, driverError, expected] of [
    [{}, null, 'database_not_configured'],
    [{ MONGODB_URI: privateUri }, new mongo.MongoServerError({ message: privateUri, code: 18 }), 'database_authentication_failed'],
  ]) {
    const logs = [];
    const connect = createDBConnector({
      mongoose: { connection: { readyState: 0 }, connect: async () => { throw driverError; } }, env,
    });
    const middleware = createDatabaseMiddleware({ connect, logger: (...args) => logs.push(args) });
    let status;
    let body;
    const res = {
      status(value) { status = value; return this; },
      json(value) { body = value; },
    };
    await middleware({}, res, () => assert.fail('unavailable database must block API handlers'));
    assert.equal(status, 503);
    assert.deepEqual(body, { success: false, error: 'The service is temporarily unavailable. Please try again shortly.' });
    assert.deepEqual(logs, [['[CafeSync database]', { code: expected }]]);
    assert.equal(JSON.stringify({ logs, body }).includes('private-'), false);
  }
  const logs = [];
  logDatabaseFailure((...args) => logs.push(args), failure({ code: privateUri, diagnostic: privateUri }));
  assert.deepEqual(logs, [['[CafeSync database]', { code: 'database_unavailable' }]]);
  assert.doesNotThrow(() => logDatabaseFailure(() => { throw new Error('Logger failed'); }, failure({})));
});
