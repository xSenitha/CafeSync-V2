const express = require('express');
const {
  getInventoryItems,
  getInventoryItem,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} = require('./inventory.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');
const upload = require('../../utils/upload');

const router = express.Router();

router
  .route('/')
  .get(getInventoryItems)
  .post(protect, authorize('admin'), upload.single('image'), addInventoryItem);

router
  .route('/:id')
  .get(getInventoryItem)
  .put(protect, authorize('admin'), upload.single('image'), updateInventoryItem)
  .delete(protect, authorize('admin'), deleteInventoryItem);

module.exports = router;
