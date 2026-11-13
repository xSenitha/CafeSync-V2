const jwt = require('jsonwebtoken');

function authConfigurationError(code) {
  const error = new Error('Sign-in is temporarily unavailable. Please try again later.');
  error.name = 'AuthConfigurationError';
  error.code = code;
  error.statusCode = 503;
  return error;
}

function assertAuthConfigured(env = process.env) {
  if (typeof env.JWT_SECRET !== 'string' || !env.JWT_SECRET.trim()) {
    throw authConfigurationError('AUTH_NOT_CONFIGURED');
  }
}

function generateToken(id, env = process.env) {
  assertAuthConfigured(env);
  try {
    return jwt.sign({ id }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRE || '30d',
    });
  } catch {
    // Signing can reject malformed expiry or key settings. Keep the original
    // configuration and library error out of public responses and logs.
    throw authConfigurationError('AUTH_INVALID_CONFIGURATION');
  }
}

function verifyToken(token, env = process.env) {
  assertAuthConfigured(env);
  return jwt.verify(token, env.JWT_SECRET);
}

module.exports = { assertAuthConfigured, generateToken, verifyToken };
