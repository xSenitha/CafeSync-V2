const express = require('express');
const { register, login, getMe, updateProfile, deleteAccount } = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.post('/delete-account', protect, deleteAccount);

module.exports = router;
