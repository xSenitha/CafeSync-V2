const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../src/domains/users/user.model');
const { register, login } = require('../src/domains/auth/auth.controller');
const { protect } = require('../src/middlewares/auth.middleware');
const { generateToken, verifyToken } = require('../src/utils/jwt');

const fixtureSecret = 'fixture-auth-secret-that-is-not-a-production-key';
const registration = {
  name: 'Fixture customer', email: 'Fixture@Example.com', password: 'fixture-password',
  address: 'Fixture address', mobile: '0770000000',
};

async function withAuthEnvironment(values, action) {
  const original = { JWT_SECRET: process.env.JWT_SECRET, JWT_EXPIRE: process.env.JWT_EXPIRE };
  for (const name of Object.keys(original)) {
    if (values[name] === undefined) delete process.env[name];
    else process.env[name] = values[name];
  }
  try { return await action(); } finally {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

function response() {
  return {
    statusCode: 200, body: undefined,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('JWT signing rejects missing secrets and malformed expiry without exposing configuration', () => {
  for (const env of [{}, { JWT_SECRET: '' }, { JWT_SECRET: '  ' }]) {
    assert.throws(() => generateToken('fixture-id', env), {
      name: 'AuthConfigurationError', code: 'AUTH_NOT_CONFIGURED', statusCode: 503,
    });
  }
  assert.throws(() => generateToken('fixture-id', {
    JWT_SECRET: fixtureSecret, JWT_EXPIRE: 'private-invalid-expiry',
  }), (error) => {
    assert.equal(error.name, 'AuthConfigurationError');
    assert.equal(error.code, 'AUTH_INVALID_CONFIGURATION');
    assert.equal(error.statusCode, 503);
    assert.equal(error.cause, undefined);
    assert.equal(error.message.includes('private-invalid-expiry'), false);
    assert.equal(error.message.includes(fixtureSecret), false);
    return true;
  });
});

test('JWT signing preserves configured expiry and defaults to thirty days', () => {
  for (const [expiry, seconds] of [[undefined, 30 * 24 * 60 * 60], ['15m', 15 * 60]]) {
    const env = { JWT_SECRET: fixtureSecret, JWT_EXPIRE: expiry };
    const token = generateToken('fixture-id', env);
    const decoded = verifyToken(token, env);
    assert.equal(decoded.id, 'fixture-id');
    assert.equal(decoded.exp - decoded.iat, seconds);
  }
});

test('registration never saves an account when JWT configuration is unavailable or invalid', async (t) => {
  let writes = 0;
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User.prototype, 'save', async function () { writes += 1; return this; });
  for (const [env, expected] of [
    [{}, 'AUTH_NOT_CONFIGURED'],
    [{ JWT_SECRET: fixtureSecret, JWT_EXPIRE: 'invalid-expiry' }, 'AUTH_INVALID_CONFIGURATION'],
  ]) {
    await withAuthEnvironment(env, async () => {
      let failure;
      const res = response();
      await register({ body: registration }, res, (error) => { failure = error; });
      assert.equal(failure.code, expected);
      assert.equal(failure.statusCode, 503);
      assert.equal(res.body, undefined);
      assert.equal(writes, 0);
    });
  }
});

test('valid registration persists the user and returns a verifiable token without the password', async (t) => {
  let writes = 0;
  t.mock.method(User, 'findOne', async (query) => {
    assert.deepEqual(query, { email: 'fixture@example.com' });
    return null;
  });
  t.mock.method(User.prototype, 'save', async function () { writes += 1; return this; });
  await withAuthEnvironment({ JWT_SECRET: fixtureSecret }, async () => {
    const res = response();
    await register({ body: registration }, res, (error) => { throw error; });
    assert.equal(writes, 1);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, 'fixture@example.com');
    assert.equal(res.body.user.password, undefined);
    assert.equal(jwt.verify(res.body.token, fixtureSecret).id, String(res.body.user.id));
  });
});

test('login reports configuration failures and preserves invalid-credential and success behavior', async (t) => {
  let queries = 0;
  let validPassword = false;
  t.mock.method(User, 'findOne', () => {
    queries += 1;
    return { select: async () => ({
      _id: 'fixture-id', name: 'Fixture customer', email: registration.email, role: 'customer',
      matchPassword: async () => validPassword,
    }) };
  });
  await withAuthEnvironment({}, async () => {
    let failure;
    await login({ body: registration }, response(), (error) => { failure = error; });
    assert.equal(failure.code, 'AUTH_NOT_CONFIGURED');
    assert.equal(failure.statusCode, 503);
    assert.equal(queries, 0);
  });
  await withAuthEnvironment({ JWT_SECRET: fixtureSecret }, async () => {
    const invalid = response();
    await login({ body: registration }, invalid, (error) => { throw error; });
    assert.equal(invalid.statusCode, 401);
    assert.equal(invalid.body.error, 'Invalid credentials');
    validPassword = true;
    const valid = response();
    await login({ body: registration }, valid, (error) => { throw error; });
    assert.equal(valid.statusCode, 200);
    assert.equal(jwt.verify(valid.body.token, fixtureSecret).id, 'fixture-id');
  });
});

test('protected routes forward missing configuration as 503 and keep invalid tokens unauthorized', async (t) => {
  let queries = 0;
  const fixtureUser = { id: 'fixture-id' };
  t.mock.method(User, 'findById', async () => { queries += 1; return fixtureUser; });
  const token = generateToken('fixture-id', { JWT_SECRET: fixtureSecret });
  await withAuthEnvironment({}, async () => {
    let failure;
    const res = response();
    await protect({ headers: { authorization: `Bearer ${token}` } }, res, (error) => { failure = error; });
    assert.equal(failure.code, 'AUTH_NOT_CONFIGURED');
    assert.equal(failure.statusCode, 503);
    assert.equal(res.body, undefined);
    assert.equal(queries, 0);
  });
  await withAuthEnvironment({ JWT_SECRET: fixtureSecret }, async () => {
    const invalid = response();
    await protect({ headers: { authorization: 'Bearer malformed-token' } }, invalid, () => assert.fail('Invalid token passed'));
    assert.equal(invalid.statusCode, 401);
    const req = { headers: { authorization: `Bearer ${token}` } };
    let passed = false;
    await protect(req, response(), (error) => { assert.equal(error, undefined); passed = true; });
    assert.equal(passed, true);
    assert.equal(req.user, fixtureUser);
  });
});
