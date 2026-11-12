const { loadEnv } = require('../src/config/env');
const { resolveAIConfig } = require('../src/config/ai');
const {
  DIAGNOSTIC_MESSAGES, readProviderFailure, classifyNetworkFailure,
} = require('../src/domains/assistant/assistant.provider');

async function runCheck({ loadEnvironment = loadEnv, env = process.env, fetchImpl = fetch, output = console.log } = {}) {
  loadEnvironment();
  const report = ({ code, status }) => {
    const safeCode = Object.hasOwn(DIAGNOSTIC_MESSAGES, code) ? code : 'provider_unavailable';
    output(`[${safeCode}]${status ? ` HTTP ${status}.` : ''} ${DIAGNOSTIC_MESSAGES[safeCode]}`);
    return 1;
  };
  let config;
  try {
    config = resolveAIConfig(env);
  } catch {
    return report({ code: 'invalid_configuration' });
  }
  const { apiKey, model, provider } = config;
  if (!apiKey) return report({ code: 'not_configured' });

  try {
    // A single minimal request checks credentials and model access without a
    // database or customer data. Never print credentials or provider bodies.
    const gemini = provider === 'gemini';
    const response = await fetchImpl(gemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : 'https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(gemini ? { 'x-goog-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` }) },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify(gemini
        ? { contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }], generationConfig: { maxOutputTokens: 16 } }
        : { model, input: 'Reply with OK.', max_output_tokens: 16, store: false }),
    });
    if (!response.ok) return report(await readProviderFailure(response, provider));
    output(`[available] ${gemini ? 'Gemini' : 'OpenAI'} accepted the diagnostic request. The API key and model access are working.`);
    return 0;
  } catch (error) {
    return report({ code: classifyNetworkFailure(error) });
  }
}

if (require.main === module) {
  runCheck().then((exitCode) => { process.exitCode = exitCode; });
}

module.exports = { runCheck };
