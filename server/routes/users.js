const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const router = express.Router();

// Get all users (admin only)
router.get('/', (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/:id', (req, res) => {
  try {
    const user = db.findUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if username exists
    const existingUser = db.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = db.createUser({
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      isActive: true
    });

    const { password: _, ...userData } = user;
    res.status(201).json(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', (req, res) => {
  try {
    const { name, role, isActive } = req.body;
    
    // Check if trying to modify admin user
    const existingUser = db.findUserById(req.params.id);
    if (existingUser && existingUser.username === 'admin') {
      return res.status(403).json({ message: 'Cannot modify admin user' });
    }
    
    const user = db.updateUser(req.params.id, { name, role, isActive });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const { password, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Deactivate user (admin only)
router.delete('/:id', (req, res) => {
  try {
    // Check if trying to delete admin user
    const existingUser = db.findUserById(req.params.id);
    if (existingUser && existingUser.username === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }
    
    db.deactivateUser(req.params.id);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reactivate user (admin only)
router.put('/:id/reactivate', (req, res) => {
  try {
    const user = db.reactivateUser(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User reactivated successfully', user });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
