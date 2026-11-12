const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
} = require('./order.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getOrders).post(createOrder);
router.route('/:id').get(getOrder).delete(authorize('admin'), deleteOrder);
router.route('/:id/status').put(authorize('admin'), updateOrderStatus);
router.route('/:id/payment').put(authorize('admin'), updatePaymentStatus);

module.exports = router;
