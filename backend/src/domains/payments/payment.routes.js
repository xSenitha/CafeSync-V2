const express = require('express');
const {
  recordPayment,
  getPayments,
  updatePaymentStatus,
  deletePayment,
} = require('./payment.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getPayments).post(recordPayment);
router.route('/:id')
  .put(authorize('admin'), updatePaymentStatus)
  .delete(authorize('admin'), deletePayment);

module.exports = router;
