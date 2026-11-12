const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: 'Inventory',
          required: true,
        },
        name: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    orderType: {
      type: String,
      enum: ['Dine-In', 'Takeaway', 'Online Delivery'],
      default: 'Dine-In',
    },
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Online', 'Pay Later', 'Cash on Delivery', 'Pay on Pickup'],
      default: 'Cash',
    },
    tableNumber: {
      type: Number,
    },
    deliveryAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
