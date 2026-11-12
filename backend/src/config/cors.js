const LOCAL_ORIGINS = Object.freeze([
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19006',
  'http://localhost:3000',
]);

function createCorsOptions(env = process.env) {
  const configured = env.CORS_ORIGINS ?? '';
  if (typeof configured !== 'string') {
    throw new Error('CORS_ORIGINS must be a comma-separated list of HTTP(S) origins.');
  }
  const origins = configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    .map((origin, index) => {
      try {
        const parsed = new URL(origin);
        if (!/^https?:\/\//i.test(origin) || !['http:', 'https:'].includes(parsed.protocol)
          || /[\s\\*@?#]/.test(origin) || parsed.username || parsed.password
          || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.origin === 'null') {
          throw new Error('Invalid origin');
        }
        // Canonical origins match what browsers send (including default-port
        // normalization); a pasted trailing slash does not become a path rule.
        return parsed.origin;
      } catch {
        throw new Error(`CORS_ORIGINS entry ${index + 1} must be an HTTP(S) origin without credentials, paths, queries, fragments, or wildcards.`);
      }
    });

  return {
    origin: [...new Set([...LOCAL_ORIGINS, ...origins])],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}

module.exports = { createCorsOptions, LOCAL_ORIGINS };
