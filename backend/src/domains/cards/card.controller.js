const Card = require('./card.model');

// @desc  Get all cards for logged-in user
// @route GET /api/cards
// @access Private
exports.getCards = async (req, res) => {
  try {
    const cards = await Card.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Add a new card
// @route POST /api/cards
// @access Private
exports.addCard = async (req, res) => {
  try {
    const { last4, brand, cardholderName, expiryMonth, expiryYear, isDefault } = req.body;

    if (!last4 || !brand || !cardholderName || !expiryMonth || !expiryYear) {
      return res.status(400).json({ success: false, message: 'Please provide all required card details' });
    }

    if (last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      return res.status(400).json({ success: false, message: 'last4 must be exactly 4 digits' });
    }

    const currentYear = new Date().getFullYear();
    const parsedYear  = parseInt(expiryYear);
    const parsedMonth = parseInt(expiryMonth);

    if (
      parsedYear < currentYear ||
      (parsedYear === currentYear && parsedMonth < new Date().getMonth() + 1)
    ) {
      return res.status(400).json({ success: false, message: 'Card has already expired' });
    }

    // If this new card is set as default, unset others
    if (isDefault) {
      await Card.updateMany({ user: req.user.id }, { isDefault: false });
    }

    // First card is always default
    const count = await Card.countDocuments({ user: req.user.id });
    const shouldBeDefault = isDefault || count === 0;

    const card = await Card.create({
      user: req.user.id,
      last4,
      brand: brand || 'Other',
      cardholderName,
      expiryMonth: parsedMonth,
      expiryYear: parsedYear,
      isDefault: shouldBeDefault,
    });

    res.status(201).json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Update a card (set as default, update name/expiry)
// @route PUT /api/cards/:id
// @access Private
exports.updateCard = async (req, res) => {
  try {
    let card = await Card.findOne({ _id: req.params.id, user: req.user.id });

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const { cardholderName, isDefault, expiryMonth, expiryYear } = req.body;

    if (isDefault) {
      await Card.updateMany({ user: req.user.id }, { isDefault: false });
    }

    const updateData = {};
    if (cardholderName !== undefined) updateData.cardholderName = cardholderName;
    if (isDefault !== undefined)      updateData.isDefault      = isDefault;
    if (expiryMonth !== undefined)    updateData.expiryMonth    = parseInt(expiryMonth);
    if (expiryYear !== undefined)     updateData.expiryYear     = parseInt(expiryYear);

    card = await Card.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Delete a card
// @route DELETE /api/cards/:id
// @access Private
exports.deleteCard = async (req, res) => {
  try {
    const card = await Card.findOne({ _id: req.params.id, user: req.user.id });

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const wasDefault = card.isDefault;
    await card.deleteOne();

    // Promote most recent card to default
    if (wasDefault) {
      const next = await Card.findOne({ user: req.user.id }).sort({ createdAt: -1 });
      if (next) await Card.findByIdAndUpdate(next._id, { isDefault: true });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
