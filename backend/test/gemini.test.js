const test = require('node:test');
const assert = require('node:assert/strict');
const { getAssistantReply } = require('../src/domains/assistant/assistant.service');
const { resolveAIConfig } = require('../src/config/ai');
const { runCheck } = require('../scripts/check-ai');

const coffee = {
  _id: 'coffee-id', name: 'Flat white', description: 'Espresso with milk',
  price: 650, category: 'Coffee', image: 'private-product-image.jpg', stock: 5,
};
const context = { menu: [coffee], orders: [], reservations: [] };
const providerKey = 'fixture-only-gemini-key';
const unavailableMessage = 'AI replies are unavailable right now. You can still use the menu guide.';
const replyObject = {
  reply: 'Try the flat white.', recommendedItemIds: ['coffee-id'], screens: ['Home'],
};
const completed = (value = replyObject) => ({
  candidates: [{ finishReason: 'STOP', content: {
    role: 'model', parts: [{ text: JSON.stringify(value) }],
  } }],
});
const options = (overrides = {}) => ({
  provider: 'gemini', apiKey: providerKey, model: 'gemini-3.5-flash-lite',
  message: 'Recommend coffee', history: [], context, logger: () => {},
  // Every test injects a fetch implementation: this suite never uses a live API.
  fetchImpl: async () => { throw new Error('Unexpected test request'); },
  ...overrides,
});

test('Gemini uses its native endpoint, header authentication and structured conversation format', async () => {
  let request;
  const history = [
    { role: 'user', content: 'I would like a coffee.' },
    { role: 'assistant', content: 'What would you like to try?' },
  ];
  const result = await getAssistantReply(options({
    history,
    fetchImpl: async (url, init) => {
      request = { url, ...init, body: JSON.parse(init.body) };
      return { ok: true, json: async () => completed({
        ...replyObject, recommendedItemIds: ['coffee-id', 'invented-id', 'coffee-id'],
        screens: ['Home', 'DeleteAccount', '__proto__', 'Home'],
      }) };
    },
  }));

  assert.equal(result.mode, 'ai');
  assert.deepEqual(result.recommendations, [coffee]);
  assert.deepEqual(result.actions.map(({ screen }) => screen), ['Home']);
  assert.equal(Object.hasOwn(result, 'availability'), false);
  assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
  assert.equal(request.url.includes('openai.com'), false);
  assert.equal(request.url.includes(providerKey), false);
  assert.equal(request.method, 'POST');
  assert.equal(request.headers['x-goog-api-key'], providerKey);
  assert.equal(Object.keys(request.headers).some((header) => header.toLowerCase() === 'authorization'), false);
  assert.equal(JSON.stringify(request.body).includes(providerKey), false);
  assert.deepEqual(request.body.contents, [
    { role: 'user', parts: [{ text: history[0].content }] },
    { role: 'model', parts: [{ text: history[1].content }] },
    { role: 'user', parts: [{ text: 'Recommend coffee' }] },
  ]);
  assert.ok(Array.isArray(request.body.systemInstruction.parts));
  const systemText = JSON.stringify(request.body.systemInstruction);
  assert.ok(systemText.includes('Flat white'));
  assert.ok(systemText.includes('coffee-id'));
  assert.equal(systemText.includes(coffee.image), false);
  assert.equal(request.body.generationConfig.responseMimeType, 'application/json');
  const schema = request.body.generationConfig.responseJsonSchema;
  assert.equal(schema.type, 'object');
  assert.deepEqual(schema.required, ['reply', 'recommendedItemIds', 'screens']);
  assert.equal(schema.properties.reply.type, 'string');
  assert.equal(schema.properties.recommendedItemIds.items.type, 'string');
  assert.deepEqual(schema.properties.screens.items.enum, ['Home', 'Orders', 'Reservations']);
  assert.ok(request.signal instanceof AbortSignal);
});

test('Gemini ignores thought parts and only parses the visible final response', async () => {
  const response = completed();
  response.candidates[0].content.parts.unshift({ thought: true, text: 'PRIVATE REASONING: not final JSON' });
  const result = await getAssistantReply(options({
    fetchImpl: async () => ({ ok: true, json: async () => response }),
  }));
  assert.equal(result.mode, 'ai');
  assert.equal(result.reply, replyObject.reply);
  assert.equal(JSON.stringify(result).includes('PRIVATE REASONING'), false);
});

test('blocked, truncated, malformed and thought-only Gemini responses use the safe guide', async () => {
  const truncated = completed();
  truncated.candidates[0].finishReason = 'MAX_TOKENS';
  const malformed = completed();
  malformed.candidates[0].content.parts = [{ text: '{not-json' }];
  const thoughtOnly = completed();
  thoughtOnly.candidates[0].content.parts[0].thought = true;
  const missingFinish = completed();
  delete missingFinish.candidates[0].finishReason;
  for (const response of [
    { promptFeedback: { blockReason: 'SAFETY' } },
    { ...completed(), promptFeedback: { blockReason: 'SAFETY' } },
    truncated, malformed, thoughtOnly, missingFinish,
    { candidates: [] },
    completed({ reply: '', recommendedItemIds: [], screens: [] }),
  ]) {
    const result = await getAssistantReply(options({
      fetchImpl: async () => ({ ok: true, json: async () => response }),
    }));
    assert.equal(result.mode, 'guide');
    assert.equal(result.availability.code, 'invalid_response');
    assert.equal(result.availability.message, unavailableMessage);
    assert.deepEqual(result.recommendations, [coffee]);
  }
});

test('Gemini missing keys and unsupported providers never make a network request', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; throw new Error('must not call'); };
  for (const [overrides, expected] of [
    [{ apiKey: '' }, 'not_configured'],
    [{ provider: 'unsupported-provider' }, 'invalid_configuration'],
    [{ provider: 'unsupported-provider', apiKey: '' }, 'invalid_configuration'],
  ]) {
    const result = await getAssistantReply(options({ ...overrides, fetchImpl }));
    assert.equal(result.mode, 'guide');
    assert.equal(result.availability.code, expected);
    assert.equal(result.availability.message, unavailableMessage);
  }
  assert.equal(calls, 0);
});

test('Google provider failures are classified without leaking credentials or raw error details', async () => {
  const sensitive = `PRIVATE UPSTREAM BODY ${providerKey}`;
  for (const [status, error, expected] of [
    [400, { code: 400, status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] }, 'authentication_failed'],
    [403, { code: 403, status: 'PERMISSION_DENIED' }, 'permission_denied'],
    [404, { code: 404, status: 'NOT_FOUND' }, 'model_unavailable'],
    [429, { code: 429, status: 'RESOURCE_EXHAUSTED' }, 'rate_limited'],
    [402, { code: 402, status: 'FAILED_PRECONDITION' }, 'quota_exceeded'],
    [503, { code: 503, status: 'UNAVAILABLE' }, 'provider_unavailable'],
  ]) {
    const logs = [];
    const result = await getAssistantReply(options({
      logger: (...args) => logs.push(args),
      fetchImpl: async () => ({ ok: false, status, json: async () => ({ error: { ...error, message: sensitive } }) }),
    }));
    assert.equal(result.mode, 'guide');
    assert.deepEqual(result.availability, { code: expected, message: unavailableMessage });
    assert.ok(logs.length > 0);
    assert.ok(JSON.stringify(logs).includes(expected));
    assert.equal(JSON.stringify({ result, logs }).includes(providerKey), false);
    assert.equal(JSON.stringify({ result, logs }).includes('PRIVATE UPSTREAM BODY'), false);
    assert.equal(JSON.stringify(result).includes(error.status), false);
  }
});

test('Gemini network and timeout failures retain a usable menu guide without raw traces', async () => {
  for (const [name, expected] of [['Error', 'network_error'], ['TimeoutError', 'timeout']]) {
    const logs = [];
    const result = await getAssistantReply(options({
      logger: (...args) => logs.push(args),
      fetchImpl: async () => { const error = new Error(`PRIVATE TRACE ${providerKey}`); error.name = name; throw error; },
    }));
    assert.equal(result.mode, 'guide');
    assert.equal(result.availability.code, expected);
    assert.deepEqual(result.recommendations, [coffee]);
    assert.equal(JSON.stringify({ result, logs }).includes('PRIVATE TRACE'), false);
    assert.equal(JSON.stringify({ result, logs }).includes(providerKey), false);
  }
});

test('AI configuration keeps legacy OpenAI defaults and selects Gemini only when appropriate', () => {
  assert.deepEqual(resolveAIConfig({}), { provider: 'openai', apiKey: '', model: 'gpt-4.1-mini' });
  assert.deepEqual(resolveAIConfig({ OPENAI_API_KEY: ' fixture-openai ' }), {
    provider: 'openai', apiKey: 'fixture-openai', model: 'gpt-4.1-mini',
  });
  assert.deepEqual(resolveAIConfig({ GEMINI_API_KEY: ' fixture-gemini ' }), {
    provider: 'gemini', apiKey: 'fixture-gemini', model: 'gemini-3.5-flash-lite',
  });
  assert.deepEqual(resolveAIConfig({ OPENAI_API_KEY: '  ', GEMINI_API_KEY: 'fixture-gemini' }), {
    provider: 'gemini', apiKey: 'fixture-gemini', model: 'gemini-3.5-flash-lite',
  });
  assert.deepEqual(resolveAIConfig({ OPENAI_API_KEY: 'fixture-openai', GEMINI_API_KEY: 'fixture-gemini' }), {
    provider: 'openai', apiKey: 'fixture-openai', model: 'gpt-4.1-mini',
  });
});

test('explicit AI provider selection trims casing, selected credentials and model overrides', () => {
  const bothKeys = { OPENAI_API_KEY: 'fixture-openai', GEMINI_API_KEY: ' fixture-gemini ' };
  assert.deepEqual(resolveAIConfig({ ...bothKeys, AI_PROVIDER: ' GeMiNi ', GEMINI_MODEL: ' fixture-gemini-model ' }), {
    provider: 'gemini', apiKey: 'fixture-gemini', model: 'fixture-gemini-model',
  });
  assert.deepEqual(resolveAIConfig({ ...bothKeys, AI_PROVIDER: ' OPENAI ', OPENAI_MODEL: ' fixture-openai-model ' }), {
    provider: 'openai', apiKey: 'fixture-openai', model: 'fixture-openai-model',
  });
  assert.deepEqual(resolveAIConfig({ AI_PROVIDER: 'gemini', OPENAI_API_KEY: 'fixture-openai', GEMINI_MODEL: ' ' }), {
    provider: 'gemini', apiKey: '', model: 'gemini-3.5-flash-lite',
  });
  assert.deepEqual(resolveAIConfig({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'fixture-gemini' }), {
    provider: 'openai', apiKey: '', model: 'gpt-4.1-mini',
  });
  assert.throws(() => resolveAIConfig({ AI_PROVIDER: 'other', GEMINI_API_KEY: 'fixture-gemini' }), {
    message: 'AI_PROVIDER must be openai or gemini.',
  });
});

test('Gemini diagnostic makes one minimal native request without exposing the credential', async () => {
  const logs = [];
  let calls = 0;
  let loaded = false;
  const exitCode = await runCheck({
    loadEnvironment: () => { loaded = true; },
    env: { AI_PROVIDER: 'gemini', GEMINI_API_KEY: providerKey, GEMINI_MODEL: 'fixture-gemini-model' },
    output: (line) => logs.push(line),
    fetchImpl: async (url, init) => {
      calls += 1;
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/fixture-gemini-model:generateContent');
      assert.equal(init.method, 'POST');
      assert.equal(init.headers['x-goog-api-key'], providerKey);
      assert.equal(url.includes(providerKey), false);
      assert.equal(init.body.includes(providerKey), false);
      assert.deepEqual(JSON.parse(init.body), {
        contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
        generationConfig: { maxOutputTokens: 16 },
      });
      return { ok: true };
    },
  });
  assert.equal(loaded, true);
  assert.equal(calls, 1);
  assert.equal(exitCode, 0);
  assert.match(logs[0], /\[available\].*Gemini/);
  assert.equal(JSON.stringify(logs).includes(providerKey), false);
});

test('diagnostic rejects unsupported provider configuration before requesting a model', async () => {
  const logs = [];
  let calls = 0;
  const exitCode = await runCheck({
    loadEnvironment: () => {},
    env: { AI_PROVIDER: 'unsupported-provider', GEMINI_API_KEY: providerKey },
    output: (line) => logs.push(line),
    fetchImpl: async () => { calls += 1; throw new Error('must not call'); },
  });
  assert.equal(exitCode, 1);
  assert.equal(calls, 0);
  assert.match(logs[0], /\[invalid_configuration\]/);
  assert.equal(JSON.stringify(logs).includes(providerKey), false);
});
