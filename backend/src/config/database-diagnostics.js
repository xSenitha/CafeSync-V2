const DATABASE_DIAGNOSTIC_CODES = new Set([
  'database_not_configured',
  'database_invalid_configuration',
  'database_authentication_failed',
  'database_dns_error',
  'database_tls_error',
  'database_network_error',
  'database_timeout',
  'database_unavailable',
]);

function databaseFailures(error) {
  const pending = [error];
  const seen = new Set();
  const failures = [];
  // MongoDB nests socket/DNS errors inside causes and topology descriptions.
  // Bound traversal and handle cycles without retaining the original error.
  while (pending.length && seen.size < 64) {
    const current = pending.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    failures.push(current);
    pending.push(current.cause, current.reason, current.error);
    if (Array.isArray(current.errors)) pending.push(...current.errors.slice(0, 64));
    if (current.servers instanceof Map) {
      for (const server of current.servers.values()) {
        pending.push(server?.error);
        if (pending.length >= 64) break;
      }
    }
  }
  return failures;
}

function classifyDatabaseFailure(error) {
  if (DATABASE_DIAGNOSTIC_CODES.has(error?.diagnostic)) return error.diagnostic;
  if (error?.code === 'DATABASE_NOT_CONFIGURED') return 'database_not_configured';

  const failures = databaseFailures(error);
  if (failures.some(({ name }) => ['MongoParseError', 'MongoInvalidArgumentError'].includes(name))) {
    return 'database_invalid_configuration';
  }
  if (failures.some(({ code, codeName, message }) => code === 18 || codeName === 'AuthenticationFailed'
    || (code === 8000 && typeof message === 'string' && /bad auth|authentication failed/i.test(message)))) {
    return 'database_authentication_failed';
  }
  if (failures.some(({ code, syscall }) => ['ENOTFOUND', 'ENODATA', 'EAI_AGAIN', 'ESERVFAIL', 'EBADNAME'].includes(code)
    || ['querySrv', 'queryTxt', 'getaddrinfo'].includes(syscall))) {
    return 'database_dns_error';
  }
  if (failures.some(({ code }) => typeof code === 'string'
    && (/^ERR_(TLS|SSL)_/.test(code) || [
      'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'DEPTH_ZERO_SELF_SIGNED_CERT',
      'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    ].includes(code)))) {
    return 'database_tls_error';
  }
  if (failures.some(({ code }) => ['ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'EPIPE'].includes(code))) {
    return 'database_network_error';
  }
  if (failures.some(({ name, code }) => ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkTimeoutError'].includes(name)
    || code === 'ETIMEDOUT')) {
    return 'database_timeout';
  }
  if (failures.some(({ name }) => name === 'MongoNetworkError')) return 'database_network_error';
  return 'database_unavailable';
}

function logDatabaseFailure(logger, error) {
  // Log only a fixed category; URI, hostname, credentials, raw messages and
  // nested driver errors must never be sent to logs or public responses.
  try { logger('[CafeSync database]', { code: classifyDatabaseFailure(error) }); } catch {}
}

module.exports = { classifyDatabaseFailure, logDatabaseFailure };
