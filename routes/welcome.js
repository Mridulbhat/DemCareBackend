const express = require('express');
const User = require('../models/User');
const router = express.Router();

// POST route for user signup
router.get('/welcome', async (req, res) => {

  try {
    res.status(201).json({ message: 'Welcome to DemCare' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
