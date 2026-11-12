const CUSTOMER_UNAVAILABLE_MESSAGE = 'AI replies are unavailable right now. You can still use the menu guide.';

const DIAGNOSTIC_MESSAGES = Object.freeze({
  not_configured: 'The selected AI provider\'s API key is missing. Add its server-side key to backend/.env and restart the API.',
  invalid_configuration: 'The AI provider configuration is invalid. Set AI_PROVIDER to openai or gemini and check its model setting in backend/.env.',
  quota_exceeded: 'The AI provider reports unavailable credits or quota. Check billing and quota for the key\'s project, then retry.',
  authentication_failed: 'The AI provider rejected the API key. Verify the selected provider\'s key in backend/.env and restart the API.',
  permission_denied: 'The key or project does not have permission. Check the key\'s project permissions and model access.',
  model_unavailable: 'The configured model is unavailable to this project. Check the selected provider\'s model setting and the project\'s model access.',
  rate_limited: 'The AI provider is rate limiting requests. Wait briefly, then retry.',
  timeout: 'The AI request timed out. Check the network connection and retry.',
  network_error: 'Could not reach the AI provider. Check the connection, firewall, and proxy settings.',
  invalid_response: 'The AI provider returned a response the assistant could not read. Check model compatibility and retry.',
  provider_unavailable: 'The AI provider could not complete the request. Check service availability and the model configuration, then retry.',
});

function safeHttpStatus(status) {
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
}

async function readProviderFailure(response, provider = 'openai') {
  const status = safeHttpStatus(response?.status);
  let providerCode;
  let providerType;
  let googleStatus;
  let googleReasons = [];
  try {
    const body = await response.json();
    providerCode = body?.error?.code;
    providerType = body?.error?.type;
    if (provider === 'gemini') {
      googleStatus = body?.error?.status;
      googleReasons = Array.isArray(body?.error?.details)
        ? body.error.details.map((detail) => detail?.reason).filter((reason) => typeof reason === 'string') : [];
    }
  } catch {
    // Never expose an upstream body or raw error in logs or customer responses.
  }

  let code = 'provider_unavailable';
  if (provider === 'gemini') {
    const hasReason = (...reasons) => googleReasons.some((reason) => reasons.includes(reason));
    if (status === 401 || googleStatus === 'UNAUTHENTICATED'
      || hasReason('API_KEY_INVALID', 'API_KEY_EXPIRED', 'API_KEY_REVOKED')) code = 'authentication_failed';
    else if (status === 402 || hasReason('PREPAID_BALANCE_EXHAUSTED', 'QUOTA_EXCEEDED', 'DAILY_LIMIT_EXCEEDED', 'BILLING_QUOTA_EXCEEDED', 'PROJECT_QUOTA_EXCEEDED')) code = 'quota_exceeded';
    else if (status === 403 || googleStatus === 'PERMISSION_DENIED') code = 'permission_denied';
    else if (status === 404 || googleStatus === 'NOT_FOUND') code = 'model_unavailable';
    else if (status === 429 || googleStatus === 'RESOURCE_EXHAUSTED') code = 'rate_limited';
    else if (status === 408 || status === 504 || googleStatus === 'DEADLINE_EXCEEDED') code = 'timeout';
    return { code, status };
  }
  if (status === 401) code = 'authentication_failed';
  else if (status === 403) code = 'permission_denied';
  else if (status === 404 || ['model_not_found', 'model_not_available', 'unsupported_model', 'invalid_model'].includes(providerCode)) code = 'model_unavailable';
  else if (status === 429) {
    const quotaCodes = [
      'insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached', 'billing_not_active',
      'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded',
    ];
    code = quotaCodes.includes(providerCode) || quotaCodes.includes(providerType) ? 'quota_exceeded' : 'rate_limited';
  } else if (status === 408 || status === 504) code = 'timeout';
  return { code, status };
}

function classifyNetworkFailure(error) {
  return ['AbortError', 'TimeoutError'].includes(error?.name) ? 'timeout' : 'network_error';
}

function logProviderFailure(logger, { code, status }) {
  const safeCode = Object.hasOwn(DIAGNOSTIC_MESSAGES, code) ? code : 'provider_unavailable';
  const safeStatus = safeHttpStatus(status);
  try {
    logger('[CafeSync assistant]', { code: safeCode, ...(safeStatus ? { status: safeStatus } : {}) });
  } catch {
    // A diagnostic logger must never interrupt the menu guide.
  }
}

module.exports = {
  CUSTOMER_UNAVAILABLE_MESSAGE, DIAGNOSTIC_MESSAGES,
  readProviderFailure, classifyNetworkFailure, logProviderFailure,
};
