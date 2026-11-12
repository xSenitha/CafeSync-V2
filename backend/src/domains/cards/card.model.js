const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Stored masked — last 4 digits only, never full PAN
    last4: {
      type: String,
      required: true,
      length: 4,
    },
    // Card brand: Visa, Mastercard, Amex, etc.
    brand: {
      type: String,
      required: true,
      enum: ['Visa', 'Mastercard', 'Amex', 'Other'],
      default: 'Other',
    },
    cardholderName: {
      type: String,
      required: true,
      trim: true,
    },
    expiryMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    expiryYear: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Card', cardSchema);
