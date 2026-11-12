const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
console.log('Attempting to connect to:', uri);

mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection error:', err);
    process.exit(1);
  });
