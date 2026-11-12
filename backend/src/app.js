const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8082', 'http://localhost:19006', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true, parameterLimit: 100000 }));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (to be added)
app.use('/api', require('./routes'));

// Error Handler
app.use(errorHandler);

module.exports = app;
