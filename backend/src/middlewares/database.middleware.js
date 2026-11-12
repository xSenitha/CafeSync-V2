const connectDB = require('../config/db');
const { logDatabaseFailure } = require('../config/database-diagnostics');

function createDatabaseMiddleware({ connect = connectDB, logger = console.warn } = {}) {
  return async (req, res, next) => {
    try {
      await connect();
      next();
    } catch (error) {
      // Do not pass connection errors to the general handler: driver messages
      // may contain credentials, hosts, or a connection URI.
      logDatabaseFailure(logger, error);
      res.status(503).json({ success: false, error: 'The service is temporarily unavailable. Please try again shortly.' });
    }
  };
}

module.exports = { createDatabaseMiddleware };
