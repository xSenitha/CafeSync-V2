const User = require('../users/user.model');
const Order = require('../orders/order.model');
const Payment = require('../payments/payment.model');
const Reservation = require('../reservations/reservation.model');
const { generateToken } = require('../../utils/jwt');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, address, mobile } = req.body;

    if (!name || !email || !password || !address || !mobile) {
      return res.status(400).json({ success: false, error: 'Please provide all required fields' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists. Please sign in.' });
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'customer',
      address,
      mobile,
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
        mobile: user.mobile,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user (case-insensitive email)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    const allowedFields = ['name', 'email', 'address', 'mobile', 'avatar'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/profile
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }
    console.log('DELETE /api/auth/profile hit for user:', req.user.id);
    // Check for active orders
    const activeOrders = await Order.find({
      customer: req.user.id,
      status: { $nin: ['Completed', 'Cancelled'] },
    });

    if (activeOrders.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account while orders are in progress.',
      });
    }

    // Check for pending payments
    const pendingPayments = await Payment.find({
      customer: req.user.id,
      status: 'Pending',
    });

    if (pendingPayments.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with pending payments.',
      });
    }

    // Check for active reservations
    const activeReservations = await Reservation.find({
      customer: req.user.id,
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (activeReservations.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account while you have active reservations.',
      });
    }

    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};
