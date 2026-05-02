// routes/orders.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  createOrder,
  updateOrder,
  createWaiterOrder,
  createAlert,
} = require('../controllers/ordersController');

// POST /api/orders — customer places an order (no auth needed)
router.post('/', createOrder);

// POST /api/orders/waiter — waiter places an order via POS (requires JWT)
router.post('/waiter', requireAuth, createWaiterOrder);

// PUT /api/orders/:id — waiter updates order status (requires JWT)
router.put('/:id', requireAuth, updateOrder);

// POST /api/alerts — customer calls waiter (no auth needed)
router.post('/alerts', createAlert);

module.exports = router;