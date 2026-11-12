require('./config/env').loadEnv();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middlewares/error.middleware');
const { createCorsOptions } = require('./config/cors');
const { createDatabaseMiddleware } = require('./middlewares/database.middleware');

const app = express();
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors(createCorsOptions()));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Vercel can import this Express app without running server.js. Initialize the
// shared database connection before API handlers, while leaving CORS preflight
// requests and static assets independent of database availability.
app.use('/api/health', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', createDatabaseMiddleware());
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', database: 'connected' });
});
app.use('/api', require('./routes'));

// Error Handler
app.use(errorHandler);

module.exports = app;
