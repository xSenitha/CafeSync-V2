const express = require('express');
const authRoutes = require('../domains/auth/auth.routes');
const inventoryRoutes = require('../domains/inventory/inventory.routes');
const orderRoutes = require('../domains/orders/order.routes');
const reservationRoutes = require('../domains/reservations/reservation.routes');
const paymentRoutes = require('../domains/payments/payment.routes');
const cardRoutes = require('../domains/cards/card.routes');
const assistantRoutes = require('../domains/assistant/assistant.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', orderRoutes);
router.use('/reservations', reservationRoutes);
router.use('/payments', paymentRoutes);
router.use('/cards', cardRoutes);
router.use('/assistant', assistantRoutes);

module.exports = router;
