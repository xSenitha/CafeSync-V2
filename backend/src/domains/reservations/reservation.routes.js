const express = require('express');
const {
  bookTable,
  getReservations,
  getAvailability,
  updateReservation,
  deleteReservation,
} = require('./reservation.controller');
const { protect, authorize } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/availability').get(getAvailability);
router.route('/').get(getReservations).post(bookTable);
router.route('/:id').put(updateReservation).delete(authorize('admin'), deleteReservation);

module.exports = router;
