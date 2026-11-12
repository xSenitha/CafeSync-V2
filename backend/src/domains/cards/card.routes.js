const express = require('express');
const { getCards, addCard, updateCard, deleteCard } = require('./card.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getCards).post(addCard);
router.route('/:id').put(updateCard).delete(deleteCard);

module.exports = router;
