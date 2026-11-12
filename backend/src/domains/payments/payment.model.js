const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.ObjectId,
      ref: 'Order',
      required: true,
    },
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Online', 'Pay Later', 'Pay on Pickup', 'Cash on Delivery'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
