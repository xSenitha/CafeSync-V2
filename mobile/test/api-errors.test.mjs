import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiErrorMessage, toUserApiError } from '../src/api/errors.js';

test('unexpected server failures never expose internal messages, bodies or request credentials', () => {
  const internal = 'secretOrPrivateKey must have a value /var/task/backend/node_modules/jsonwebtoken/sign.js';
  const safe = toUserApiError({
    message: internal,
    response: { status: 503, data: { error: internal, stack: internal, credential: 'private-fixture' } },
    config: { headers: { Authorization: 'Bearer private-fixture' } },
    request: { token: 'private-fixture' },
  });
  assert.equal(safe.message, 'Our service is temporarily unavailable. Please try again shortly.');
  assert.equal(safe.response.status, 503);
  assert.equal(safe.response.data.error, safe.message);
  assert.equal(safe.response.data.message, safe.message);
  assert.equal(safe.config, undefined);
  assert.equal(safe.request, undefined);
  assert.equal(JSON.stringify(safe).includes('private-fixture'), false);
  assert.equal(JSON.stringify(safe).includes('secretOrPrivateKey'), false);
});

test('helpful credential and validation responses remain readable, including arrays and message fields', () => {
  for (const [status, data, expected] of [
    [401, { error: 'Invalid credentials' }, 'Invalid credentials'],
    [400, { error: ['Please add a valid email', 'Please add a password'] }, 'Please add a valid email'],
    [400, { error: 'An account with this email already exists. Please sign in.' }, 'An account with this email already exists. Please sign in.'],
    [400, { message: 'Card has already expired' }, 'Card has already expired'],
    [429, { error: 'Please wait a moment before sending another message.' }, 'Please wait a moment before sending another message.'],
  ]) assert.equal(getApiErrorMessage({ response: { status, data } }), expected);
});

test('malformed responses and internal 4xx messages use friendly fallback text', () => {
  for (const data of [
    { error: ['secretOrPrivateKey must have a value'] },
    { error: { message: 'private-fixture' } },
    { error: 'Error: private-fixture\n    at sign (/var/task/backend/index.js:4)' },
    '<html>private-fixture</html>',
    { error: 'a'.repeat(301) },
  ]) assert.equal(getApiErrorMessage({ response: { status: 400, data } }, 'Check your details and try again.'), 'Check your details and try again.');
  assert.equal(getApiErrorMessage(new Error('AsyncStorage internal error'), 'Please try again.'), 'Please try again.');
});

test('network and timeout failures get friendly text and normalization is safe when applied twice', () => {
  const network = toUserApiError({ code: 'ERR_NETWORK', message: 'internal network stack' });
  assert.equal(network.message, 'Could not connect to the cafe. Check your connection and try again.');
  assert.equal(toUserApiError(network).message, network.message);
  assert.equal(getApiErrorMessage({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' }), 'The request took too long. Please try again.');
  const invalidCredentials = toUserApiError({ response: { status: 401, data: { error: 'Invalid credentials' } } });
  assert.equal(toUserApiError(invalidCredentials).message, 'Invalid credentials');
});
