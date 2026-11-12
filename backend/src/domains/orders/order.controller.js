const Order = require('./order.model');
const Inventory = require('../inventory/inventory.model');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { items, paymentMethod, tableNumber, orderType, deliveryAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in order' });
    }

    // Validate order type requirements
    if (orderType === 'Dine-In' && !tableNumber) {
      return res.status(400).json({ success: false, error: 'Table number is required for Dine-In orders' });
    }
    if (orderType === 'Online Delivery' && !deliveryAddress) {
      return res.status(400).json({ success: false, error: 'Delivery address is required for Online Delivery orders' });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Verify stock and calculate total
    for (const item of items) {
      const product = await Inventory.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, error: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}` });
      }

      // Deduct stock
      product.stock -= item.quantity;
      await product.save();

      totalAmount += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await Order.create({
      customer: req.user.id,
      items: orderItems,
      totalAmount,
      orderType: orderType || 'Dine-In',
      paymentMethod: paymentMethod || 'Cash',
      paymentStatus: paymentMethod === 'Pay Later' ? 'Pending' : 'Pending',
      tableNumber: orderType === 'Dine-In' ? tableNumber : undefined,
      deliveryAddress: orderType === 'Online Delivery' ? deliveryAddress : undefined,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private (Admin)
exports.getOrders = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'admin') {
      query = Order.find().populate('customer', 'name email');
    } else {
      query = Order.find({ customer: req.user.id });
    }

    const orders = await query.sort('-createdAt');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer', 'name email');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Check ownership
    if (order.customer._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, error: 'Not authorized' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Admin)
exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await order.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// @desc    Update order payment status
// @route   PUT /api/orders/:id/payment
// @access  Private (Admin)
exports.updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
