const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Get all categories (public for menu display)
router.get('/', (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const categories = db.getAllCategories(activeOnly);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single category
router.get('/:id', (req, res) => {
  try {
    const categories = db.getAllCategories();
    const category = categories.find(c => c.id === parseInt(req.params.id));
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create category (admin only)
router.post('/', (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const category = db.createCategory({ name, displayOrder: displayOrder || 0, isActive: isActive !== false });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category (admin only)
router.put('/:id', (req, res) => {
  try {
    const { name, displayOrder, isActive } = req.body;
    const category = db.updateCategory(req.params.id, { name, displayOrder, isActive });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category (admin only)
router.delete('/:id', (req, res) => {
  try {
    db.deleteCategory(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
