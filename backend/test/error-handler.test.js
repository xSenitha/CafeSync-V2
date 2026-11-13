const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const mongoose = require('mongoose');
const { createErrorHandler } = require('../src/middlewares/error.middleware');
const Card = require('../src/domains/cards/card.model');
const cards = require('../src/domains/cards/card.controller');

const privateMessage = 'secretOrPrivateKey must have a value; mongodb://private-user:private-password@private-host.invalid';
const failure = (properties = {}) => Object.assign(new Error(privateMessage), properties);

async function withServer(app, run) {
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.once('error', reject);
  });
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('API errors hide library details and log only fixed server diagnostic categories', async () => {
  const app = express();
  const logs = [];
  app.get('/unexpected', () => { throw failure(); });
  app.get('/auth-config', () => { throw failure({ code: 'AUTH_NOT_CONFIGURED', statusCode: 503 }); });
  app.get('/invalid-auth-config', () => { throw failure({ code: 'AUTH_INVALID_CONFIGURATION', statusCode: 503 }); });
  app.get('/invalid-status', () => { throw failure({ statusCode: 200 }); });
  app.get('/client-error', () => { throw failure({ status: 400 }); });
  app.use(createErrorHandler({ logger: (...args) => logs.push(args) }));
  await withServer(app, async (base) => {
    for (const [path, status, message] of [
      ['/unexpected', 500, 'Something went wrong. Please try again.'],
      ['/auth-config', 503, 'The service is temporarily unavailable. Please try again shortly.'],
      ['/invalid-auth-config', 503, 'The service is temporarily unavailable. Please try again shortly.'],
      ['/invalid-status', 500, 'Something went wrong. Please try again.'],
      ['/client-error', 400, 'Please check the information you entered.'],
    ]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { success: false, error: message });
    }
  });
  assert.deepEqual(logs, [
    ['[CafeSync API]', { code: 'unexpected_server_error', status: 500 }],
    ['[CafeSync API]', { code: 'auth_not_configured', status: 503 }],
    ['[CafeSync API]', { code: 'auth_invalid_configuration', status: 503 }],
    ['[CafeSync API]', { code: 'unexpected_server_error', status: 500 }],
  ]);
  assert.equal(JSON.stringify(logs).includes('private-'), false);
});

test('validation, duplicate, malformed JSON and upload errors remain helpful without exposing submitted values', async () => {
  const app = express();
  app.use(express.json({ limit: 100 }));
  const validation = new mongoose.Error.ValidationError();
  validation.addError('password', new mongoose.Error.ValidatorError({
    path: 'password', type: 'minlength', value: privateMessage, message: privateMessage,
  }));
  validation.addError('email', new mongoose.Error.ValidatorError({
    path: 'email', type: 'required', message: privateMessage,
  }));
  app.get('/validation', () => { throw validation; });
  app.get('/duplicate', () => { throw failure({ code: 11000, keyValue: { email: 'private-person@example.invalid' } }); });
  app.get('/cast', () => { throw new mongoose.Error.CastError('ObjectId', privateMessage, '_id'); });
  app.get('/upload', () => { throw failure({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' }); });
  app.post('/json', (req, res) => res.json({ success: true }));
  app.use(createErrorHandler({ logger: () => assert.fail('ordinary input errors should not log private data') }));
  await withServer(app, async (base) => {
    for (const [path, status, message] of [
      ['/validation', 400, ['The password is too short.', 'Please provide your email address.']],
      ['/duplicate', 400, 'An account with this email already exists. Please sign in.'],
      ['/cast', 404, 'The requested item could not be found.'],
      ['/upload', 413, 'The request is too large. Please send less data.'],
    ]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), { success: false, error: message });
    }
    const malformed = await fetch(`${base}/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{private' });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), { success: false, error: 'The request contains invalid JSON.' });
    const oversized = await fetch(`${base}/json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: privateMessage.repeat(2) }) });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), { success: false, error: 'The request is too large. Please send less data.' });
  });
});

test('card controller failures use the shared safe error handler for every operation', async (t) => {
  t.mock.method(Card, 'find', () => ({ sort: async () => { throw failure(); } }));
  t.mock.method(Card, 'countDocuments', async () => { throw failure(); });
  t.mock.method(Card, 'findOne', async () => { throw failure(); });
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 'fixture-user' }; next(); });
  app.get('/cards', cards.getCards);
  app.post('/cards', cards.addCard);
  app.put('/cards/:id', cards.updateCard);
  app.delete('/cards/:id', cards.deleteCard);
  app.use(createErrorHandler({ logger: () => {} }));
  await withServer(app, async (base) => {
    for (const [method, path] of [['GET', '/cards'], ['POST', '/cards'], ['PUT', '/cards/fixture'], ['DELETE', '/cards/fixture']]) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({
          last4: '1234', brand: 'Visa', cardholderName: 'Fixture', expiryMonth: 12, expiryYear: 2099,
        }) } : {}),
      });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { success: false, error: 'Something went wrong. Please try again.' });
    }
  });
});
