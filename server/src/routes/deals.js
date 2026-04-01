const express = require('express');
const router = express.Router();
const DealStore = require('../services/dealStore');

router.get('/', async (req, res) => {
  try {
    const deals = await DealStore.getAll();
    res.json(deals);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const deal = await DealStore.getById(req.params.id);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const deal = await DealStore.create(req.body);
    res.status(201).json(deal);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const deal = await DealStore.update(req.params.id, req.body);
    res.json(deal);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
