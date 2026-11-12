const express = require('express');
const { protect } = require('../../middlewares/auth.middleware');
const { chat } = require('./assistant.controller');
const { createAssistantLimiter } = require('./assistant.limiter');

const router = express.Router();
router.post('/chat', protect, createAssistantLimiter(), chat);

module.exports = router;
