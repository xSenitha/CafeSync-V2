const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    tableNumber: {
      type: Number,
      required: [true, 'Please add a table number'],
    },
    guests: {
      type: Number,
      required: [true, 'Please add number of guests'],
      min: 1,
    },
    date: {
      type: Date,
      required: [true, 'Please add reservation date'],
    },
    time: {
      type: String,
      required: [true, 'Please add reservation time'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    specialRequests: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);
