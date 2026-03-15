const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all menu items (available only for POS)
router.get('/', (req, res) => {
  try {
    const { isAvailable, category, grouped } = req.query;
    if (grouped === 'true') {
      const items = db.getMenuItemsGrouped();
      return res.json(items);
    }
    const items = db.getAllMenuItems({ isAvailable, category });
    res.json(items);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single menu item
router.get('/:id', (req, res) => {
  try {
    const items = db.getAllMenuItems();
    const item = items.find(i => i.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create menu item (admin only)
router.post('/', (req, res) => {
  try {
    const { name, categoryId, price, description, isAvailable } = req.body;
    if (!name || !categoryId || !price) {
      return res.status(400).json({ message: 'Name, category, and price are required' });
    }
    const item = db.createMenuItem({ name, categoryId, price, description, isAvailable: isAvailable !== false });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update menu item (admin only)
router.put('/:id', (req, res) => {
  try {
    const { name, categoryId, price, description, isAvailable } = req.body;
    const item = db.updateMenuItem(req.params.id, { name, categoryId, price, description, isAvailable });
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle menu item availability
router.patch('/:id/toggle', (req, res) => {
  try {
    const item = db.toggleMenuItemAvailability(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    console.error('Error toggling menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete menu item (admin only)
router.delete('/:id', (req, res) => {
  try {
    db.deleteMenuItem(req.params.id);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
