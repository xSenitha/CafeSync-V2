require('./config/env').loadEnv();
const app = require('./app');
const connectDB = require('./config/db');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

// Connect to Database
connectDB().then(async () => {
  try {
    // Drop any old unique indexes from DB that are no longer in our schemas
    await require('./domains/orders/order.model').syncIndexes();
    await require('./domains/payments/payment.model').syncIndexes();
    console.log('Database indexes synchronized.');
  } catch (err) {
    console.error('Index sync error:', err);
  }
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
