const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      enum: ['Coffee', 'Tea', 'Snacks', 'Desserts', 'Beverages', 'Other'],
    },
    stock: {
      type: Number,
      required: [true, 'Please add stock count'],
      default: 0,
    },
    image: {
      type: String,
      default: 'no-photo.jpg',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Inventory', inventorySchema);
