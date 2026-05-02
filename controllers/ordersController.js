// controllers/ordersController.js
// ALL Firestore writes go through here using Firebase Admin SDK.
// The Flutter client has ZERO direct Firestore access.
const { db, admin } = require('../config/firebase');

// Allowed order status values — validated on the server, not the client
const VALID_STATUSES = ['قيد الانتظار', 'جاري التجهيز', 'جاهز'];

/**
 * POST /api/orders
 * Creates a new customer order.
 * No authentication required (customers place orders),
 * but all data is sanitised and written via Admin SDK.
 *
 * Body: {
 *   customer_name: string,
 *   table_number: string | number,
 *   items_with_qty: [{ name: string, qty: number }],
 *   note: string,
 *   total_price: number,
 *   order_type: string   // optional, defaults to 'داخل المكان'
 * }
 */
async function createOrder(req, res) {
  try {
    const {
      customer_name,
      table_number,
      items_with_qty,
      note,
      total_price,
      order_type,
    } = req.body;

    // --- Validation ---
    if (!customer_name || typeof customer_name !== 'string') {
      return res.status(400).json({ error: 'customer_name is required.' });
    }
    if (!table_number) {
      return res.status(400).json({ error: 'table_number is required.' });
    }
    if (!Array.isArray(items_with_qty) || items_with_qty.length === 0) {
      return res.status(400).json({ error: 'items_with_qty must be a non-empty array.' });
    }
    if (typeof total_price !== 'number' || total_price <= 0) {
      return res.status(400).json({ error: 'total_price must be a positive number.' });
    }

    // Sanitise items — only allow expected fields
    const sanitisedItems = items_with_qty.map((item) => ({
      name: String(item.name || '').slice(0, 200),
      qty: Math.max(1, parseInt(item.qty, 10) || 1),
    }));

    const orderData = {
      customer_name: String(customer_name).slice(0, 100),
      table_number: String(table_number).slice(0, 20),
      items_with_qty: sanitisedItems,
      note: note ? String(note).slice(0, 500) : 'بدون إضافات',
      total_price: parseFloat(total_price.toFixed(2)),
      order_type: order_type ? String(order_type).slice(0, 50) : 'داخل المكان',
      status: 'قيد الانتظار',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('orders').add(orderData);

    return res.status(201).json({ id: docRef.id, message: 'Order created.' });
  } catch (err) {
    console.error('[Orders] createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create order.' });
  }
}

/**
 * PUT /api/orders/:id
 * Updates the status of an existing order.
 * Requires waiter JWT token.
 *
 * Body: { status: string }
 */
async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const orderRef = db.collection('orders').doc(id);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ id, status, message: 'Order updated.' });
  } catch (err) {
    console.error('[Orders] updateOrder error:', err);
    return res.status(500).json({ error: 'Failed to update order.' });
  }
}

/**
 * POST /api/orders/waiter
 * Waiter-placed order (POS terminal). Requires JWT.
 * Same shape as createOrder but with a 'waiter' order_type.
 */
async function createWaiterOrder(req, res) {
  // Re-use createOrder logic with forced order_type
  req.body.order_type = 'ويتر';
  return createOrder(req, res);
}

/**
 * POST /api/alerts
 * Saves a waiter-call alert to Firestore.
 * No auth required — any customer can call the waiter.
 */
async function createAlert(req, res) {
  try {
    const { customer_name, table_number } = req.body;

    if (!customer_name || !table_number) {
      return res.status(400).json({ error: 'customer_name and table_number are required.' });
    }

    const alertData = {
      customer_name: String(customer_name).slice(0, 100),
      table_number: String(table_number).slice(0, 20),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('alerts').add(alertData);

    return res.status(201).json({ id: docRef.id, message: 'Alert created.' });
  } catch (err) {
    console.error('[Orders] createAlert error:', err);
    return res.status(500).json({ error: 'Failed to create alert.' });
  }
}

module.exports = { createOrder, updateOrder, createWaiterOrder, createAlert };