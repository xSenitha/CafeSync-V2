const mongoose = require('mongoose');

function databaseError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createDBConnector({ mongoose: database = mongoose, env = process.env } = {}) {
  let inFlight = null;

  return function connectDB() {
    if (database.connection?.readyState === 1) return Promise.resolve(database.connection);
    if (inFlight) return inFlight;

    const uri = env.MONGODB_URI;
    if (typeof uri !== 'string' || !uri.trim()) {
      return Promise.reject(databaseError('DATABASE_NOT_CONFIGURED', 'Database is not configured.'));
    }

    // One connection attempt per warm API instance, shared by simultaneous
    // requests. A rejected attempt is cleared so a later request can retry.
    const pending = Promise.resolve()
      .then(() => database.connect(uri.trim(), { serverSelectionTimeoutMS: 5000 }))
      .then(() => database.connection)
      .catch(() => { throw databaseError('DATABASE_UNAVAILABLE', 'Database connection is unavailable.'); })
      .finally(() => { if (inFlight === pending) inFlight = null; });
    inFlight = pending;
    return pending;
  };
}

// Creating/importing the connector does not open a network connection.
const connectDB = createDBConnector();

module.exports = connectDB;
module.exports.createDBConnector = createDBConnector;
