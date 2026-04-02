const express = require('express');
const router = express.Router();
const { calculateCommission } = require('../services/commissionCalculator');

router.post('/calculate', (req, res) => {
  try {
    const result = calculateCommission(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
