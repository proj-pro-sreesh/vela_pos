const express = require('express');
const router = express.Router();
const { 
  getAllVendors, 
  getVendorById, 
  createVendor, 
  updateVendor, 
  deleteVendor,
  getVendorTransactions,
  getAllTransactions,
  createVendorTransaction 
} = require('../config/database');

// Get all vendors
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await getAllVendors();
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
});

// Get single vendor
router.get('/vendors/:id', async (req, res) => {
  try {
    const vendor = await getVendorById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    res.json(vendor);
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ message: 'Error fetching vendor' });
  }
});

// Create vendor
router.post('/vendors', async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Vendor name is required' });
    }
    
    const vendor = await createVendor({ name, contactPerson, phone, email, address });
    res.status(201).json(vendor);
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ message: 'Error creating vendor' });
  }
});

// Update vendor
router.put('/vendors/:id', async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, isActive } = req.body;
    
    const vendor = await updateVendor(req.params.id, { 
      name, 
      contactPerson, 
      phone, 
      email, 
      address,
      isActive 
    });
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.json(vendor);
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ message: 'Error updating vendor' });
  }
});

// Delete vendor
router.delete('/vendors/:id', async (req, res) => {
  try {
    const result = await deleteVendor(req.params.id);
    
    if (!result) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ message: 'Error deleting vendor' });
  }
});

// Get transactions for a vendor
router.get('/vendors/:id/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = await getVendorTransactions(req.params.id, limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// Get all transactions (all vendors)
router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const transactions = await getAllTransactions(limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
});

// Create transaction (debit/credit)
router.post('/vendors/:id/transactions', async (req, res) => {
  try {
    const { type, amount, description, reference } = req.body;
    
    if (!type || !amount) {
      return res.status(400).json({ message: 'Transaction type and amount are required' });
    }
    
    if (!['debit', 'credit'].includes(type)) {
      return res.status(400).json({ message: 'Transaction type must be debit or credit' });
    }
    
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    
    // Get user ID from auth middleware
    const userId = req.user?.id || req.body.userId;
    
    const transaction = await createVendorTransaction(req.params.id, {
      type,
      amount: parseFloat(amount),
      description,
      reference,
      createdBy: userId
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error creating transaction' });
  }
});

module.exports = router;