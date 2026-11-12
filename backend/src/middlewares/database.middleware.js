const connectDB = require('../config/db');

function createDatabaseMiddleware({ connect = connectDB, logger = console.warn } = {}) {
  return async (req, res, next) => {
    try {
      await connect();
      next();
    } catch {
      // Do not pass connection errors to the general handler: driver messages
      // may contain credentials, hosts, or a connection URI.
      try { logger('[CafeSync database]', { code: 'database_unavailable' }); } catch {}
      res.status(503).json({ success: false, error: 'The service is temporarily unavailable. Please try again shortly.' });
    }
  };
}

module.exports = { createDatabaseMiddleware };
