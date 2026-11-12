const Inventory = require('../inventory/inventory.model');
const Order = require('../orders/order.model');
const Reservation = require('../reservations/reservation.model');
const { validateChat, safeItem, getAssistantReply } = require('./assistant.service');
const { resolveAIConfig } = require('../../config/ai');

async function loadCustomerContext(userId, models = { Inventory, Order, Reservation }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [items, orders, reservations] = await Promise.all([
    models.Inventory.find({ isActive: true, stock: { $gt: 0 } })
      .select('_id name description price category image stock').sort({ name: 1 }).limit(100).lean(),
    models.Order.find({ customer: userId })
      .select('_id status orderType createdAt items.name items.quantity')
      .sort({ createdAt: -1 }).limit(5).lean(),
    models.Reservation.find({ customer: userId, date: { $gte: today }, status: { $in: ['Pending', 'Confirmed'] } })
      .select('_id tableNumber guests date time status').sort({ date: 1 }).limit(5).lean(),
  ]);

  return {
    menu: items.map(safeItem).filter((item) => Number.isFinite(item.price) && item.price >= 0),
    orders: orders.map((order) => ({
      _id: String(order._id), status: order.status, orderType: order.orderType,
      createdAt: order.createdAt,
      items: (order.items || []).slice(0, 20).map((item) => ({ name: item.name, quantity: item.quantity })),
    })),
    reservations: reservations.map((reservation) => ({
      _id: String(reservation._id), tableNumber: reservation.tableNumber, guests: reservation.guests,
      date: reservation.date, time: reservation.time, status: reservation.status,
    })),
  };
}

async function chat(req, res, next) {
  let input;
  try {
    input = validateChat(req.body);
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  try {
    const context = await loadCustomerContext(req.user.id);
    let config;
    try {
      config = resolveAIConfig();
    } catch {
      // Let the service return a safe configuration notice and usable guide.
      config = { provider: 'invalid', apiKey: '', model: '' };
    }
    const data = await getAssistantReply({
      ...input, context, ...config,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { chat, loadCustomerContext };
