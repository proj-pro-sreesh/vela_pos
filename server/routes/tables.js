const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all tables
router.get('/', (req, res) => {
  try {
    const { withOrders } = req.query;
    if (withOrders === 'true') {
      const tables = db.getTablesWithOrders();
      return res.json(tables);
    }
    const tables = db.getAllTables();
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single table
router.get('/:id', (req, res) => {
  try {
    const tables = db.getAllTables();
    const table = tables.find(t => t.id === parseInt(req.params.id));
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    console.error('Error fetching table:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create table (admin only)
router.post('/', (req, res) => {
  try {
    const { tableNumber, capacity, status } = req.body;
    if (!tableNumber) return res.status(400).json({ message: 'Table number is required' });
    
    const table = db.createTable({ tableNumber, capacity: capacity || 4, status: status || 'available' });
    res.status(201).json(table);
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update table (admin only)
router.put('/:id', (req, res) => {
  try {
    const { tableNumber, capacity, status } = req.body;
    const table = db.updateTable(req.params.id, { tableNumber, capacity, status });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    console.error('Error updating table:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update table status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const table = await db.updateTableStatus(req.params.id, status);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (error) {
    console.error('Error updating table status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete table (admin only)
router.delete('/:id', (req, res) => {
  try {
    db.deleteTable(req.params.id);
    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
