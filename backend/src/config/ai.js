const DEFAULT_MODELS = Object.freeze({
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-3.5-flash-lite',
});

function resolveAIConfig(env = process.env) {
  // Keep existing OpenAI installations unchanged. A Gemini-only setup can omit
  // AI_PROVIDER; set it explicitly when both providers have keys configured.
  const provider = env.AI_PROVIDER?.trim().toLowerCase()
    || (!env.OPENAI_API_KEY?.trim() && env.GEMINI_API_KEY?.trim() ? 'gemini' : 'openai');
  if (!Object.hasOwn(DEFAULT_MODELS, provider)) {
    throw new Error('AI_PROVIDER must be openai or gemini.');
  }
  const prefix = provider === 'gemini' ? 'GEMINI' : 'OPENAI';
  return {
    provider,
    apiKey: env[`${prefix}_API_KEY`]?.trim() || '',
    model: env[`${prefix}_MODEL`]?.trim() || DEFAULT_MODELS[provider],
  };
}

module.exports = { resolveAIConfig, DEFAULT_MODELS };
