const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all orders
router.get('/', async (req, res) => {
  try {
    const { status, paymentStatus, startDate, endDate } = req.query;
    const orders = await db.getAllOrders({ status, paymentStatus, startDate, endDate });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active orders (for table view)
router.get('/active', (req, res) => {
  try {
    const orders = db.getActiveOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order
router.get('/:id', (req, res) => {
  try {
    const order = db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new order
router.post('/', (req, res) => {
  try {
    const { tableId, tableNumber, waiterId, customerName, customerPhone, items, subtotal, discount, discountType, total, notes, isTakeaway } = req.body;
    
    // Allow tableId to be null/empty for takeaway orders
    const requiresTable = !isTakeaway && (tableId === undefined || tableId === null || tableId === '');
    if (requiresTable || !items || items.length === 0) {
      return res.status(400).json({ message: 'Table and items are required' });
    }

    // Get menu item details for each item
    const menuItems = db.getAllMenuItems();
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId);
      return {
        menuItemId: item.menuItemId,
        name: menuItem?.name || item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || ''
      };
    });

    const order = db.createOrder({
      tableId,
      tableNumber,
      waiterId,
      customerName,
      customerPhone,
      items: orderItems,
      subtotal,
      discount: discount || 0,
      discountType: discountType || 'percentage',
      total,
      notes,
      isTakeaway
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Process payment
router.post('/:id/payment', (req, res) => {
  try {
    const { paymentMethod, amountPaid } = req.body;
    
    if (!paymentMethod || !amountPaid) {
      return res.status(400).json({ message: 'Payment method and amount are required' });
    }

    const order = db.processPayment(req.params.id, { paymentMethod, amountPaid });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Emit socket event for payment
    const io = req.app.get('io');
    if (io) {
      io.emit('payment-processed', { orderId: order.id, orderNumber: order.orderNumber });
    }

    res.json(order);
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order
router.put('/:id', (req, res) => {
  try {
    const { items, subtotal, total, taxAmount, notes } = req.body;
    const order = db.updateOrder(req.params.id, { items, subtotal, total, taxAmount, notes });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Emit socket event for order update
    const io = req.app.get('io');
    if (io) {
      io.emit('order-updated', { orderId: order.id, orderNumber: order.orderNumber });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update order status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    // For now, just return success - we can implement more later
    res.json({ id: req.params.id, status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.deleteOrder(req.params.id);
    if (!result) return res.status(404).json({ message: 'Order not found' });
    
    // Emit socket event for order deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('order-deleted', { orderId: req.params.id });
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
