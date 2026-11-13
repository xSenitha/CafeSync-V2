const SERVICE_UNAVAILABLE = 'Our service is temporarily unavailable. Please try again shortly.';
const REQUEST_FAILED = 'Something went wrong. Please try again.';
const TRANSPORT_CODES = ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'];

function validationMessage(value) {
  const values = Array.isArray(value) ? value : [value];
  for (const message of values) {
    if (typeof message !== 'string') continue;
    const text = message.trim();
    // Older API deployments can return internal errors even with a 4xx status.
    if (!text || text.length > 300 || /[\r\n<>]/.test(text)
      || /secretOrPrivateKey|JWT_SECRET|MONGODB_URI|jsonwebtoken|node_modules|\/var\/task|stacktrace|Cast to |validation failed|E11000|Mongo(?:Server|Network|Parse|Error)|(?:Type|Reference|Syntax|Range)Error/i.test(text)) continue;
    return text;
  }
  return null;
}

export function getApiErrorMessage(error, fallback = REQUEST_FAILED) {
  const status = error?.response?.status;
  if (Number.isInteger(status) && status >= 500 && status <= 599) return SERVICE_UNAVAILABLE;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    return validationMessage(error.response?.data?.error)
      || validationMessage(error.response?.data?.message)
      || fallback;
  }
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) return 'The request took too long. Please try again.';
  if (error?.code === 'ERR_NETWORK') return 'Could not connect to the cafe. Check your connection and try again.';
  return fallback;
}

export function toUserApiError(error, fallback = REQUEST_FAILED) {
  const message = getApiErrorMessage(error, fallback);
  const safeError = new Error(message);
  safeError.name = 'ApiError';
  // Keep the status/body shape used by existing screens while discarding raw
  // server bodies, stacks, request configuration and authentication headers.
  const status = error?.response?.status;
  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    safeError.response = { status, data: { success: false, error: message, message } };
  }
  if (TRANSPORT_CODES.includes(error?.code)) safeError.code = error.code;
  return safeError;
}
