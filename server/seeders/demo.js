const mongoose = require('mongoose');

// Import Mongoose models
const User = require('../models/User');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

const seedProduction = async (reuseConnection = false) => {
  try {
    let conn;
    
    // Only connect if not reusing an existing connection
    if (!reuseConnection) {
      conn = await mongoose.connect(MONGODB_URI);
    }

    // Create demo users (using pre-hashed passwords for consistency)
    // Use upsert to handle case where users already exist
    // Only create if they don't exist to preserve user data
    const existingUsers = await User.countDocuments();
    if (existingUsers === 0) {
      await User.create([
        { username: 'admin', email: 'admin@velapos.com', password: '$2a$10$Jno92iCMcziATWO6BchIlekB/Pbcqw/o0nl0ohU3b.5EZAZ8ETTdS', name: 'Administrator', role: 'admin', isActive: true },
        { username: 'waiter', email: 'waiter@velapos.com', password: '$2a$10$7E1EUsP7forfOdc/moxEAeqFNNqw1NzKOkP.WXHpZT877XIzJ6Tm6', name: 'John Waiter', role: 'waiter', isActive: true },
        { username: 'biller', email: 'biller@velapos.com', password: '$2a$10$R1a4hGvSfQvGTsI8gtUOy.cE9B1o8sPcbicdFwiegrS.neHrxmmD.', name: 'Jane Biller', role: 'biller', isActive: true }
      ]);
    } else {
    }

    // Create categories only if none exist
    const existingCategories = await Category.countDocuments();
    if (existingCategories === 0) {
      await Category.create([
        { name: 'Vegetarian', displayOrder: 1, isActive: true },
        { name: 'Non-Vegetarian', displayOrder: 2, isActive: true },
        { name: 'Beverages', displayOrder: 3, isActive: true },
        { name: 'Desserts', displayOrder: 4, isActive: true }
      ]);
    } else {
    }

    // Create menu items only if none exist
    const existingMenuItems = await MenuItem.countDocuments();
    if (existingMenuItems === 0) {
      const veg = await Category.findOne({ name: 'Vegetarian' });
      const nonVeg = await Category.findOne({ name: 'Non-Vegetarian' });
      const beverages = await Category.findOne({ name: 'Beverages' });
      const desserts = await Category.findOne({ name: 'Desserts' });

      const menuItems = [
        { name: 'Paneer Butter Masala', category: veg._id, price: 250, isAvailable: true, description: 'Cottage cheese in creamy tomato gravy' },
        { name: 'Vegetable Biryani', category: veg._id, price: 200, isAvailable: true, description: 'Fragrant rice with mixed vegetables' },
        { name: 'Dal Makhani', category: veg._id, price: 180, isAvailable: true, description: 'Black lentils in creamy sauce' },
        { name: 'Chicken Curry', category: nonVeg._id, price: 300, isAvailable: true, description: 'Traditional chicken curry' },
        { name: 'Mutton Biryani', category: nonVeg._id, price: 400, isAvailable: true, description: 'Aromatic mutton rice dish' },
        { name: 'Fish Fry', category: nonVeg._id, price: 350, isAvailable: true, description: 'Crispy fried fish' },
        { name: 'Masala Chai', category: beverages._id, price: 30, isAvailable: true, description: 'Spiced Indian tea' },
        { name: 'Cold Coffee', category: beverages._id, price: 80, isAvailable: true, description: 'Chilled coffee with ice cream' },
        { name: 'Mango Lassi', category: beverages._id, price: 60, isAvailable: true, description: 'Sweet yogurt mango drink' },
        { name: 'Gulab Jamun', category: desserts._id, price: 80, isAvailable: true, description: 'Fried milk balls in sugar syrup' },
        { name: 'Ice Cream', category: desserts._id, price: 100, isAvailable: true, description: 'Assorted flavor ice cream' }
      ];

      await MenuItem.insertMany(menuItems);
    } else {
    }

    // Create tables only if none exist
    const existingTables = await Table.countDocuments();
    if (existingTables === 0) {
      await Table.insertMany([
        { tableNumber: 'T1', capacity: 4, status: 'available' },
        { tableNumber: 'T2', capacity: 4, status: 'available' },
        { tableNumber: 'T3', capacity: 6, status: 'available' },
        { tableNumber: 'T4', capacity: 6, status: 'available' },
        { tableNumber: 'T5', capacity: 8, status: 'available' },
        { tableNumber: 'T6', capacity: 2, status: 'available' },
        { tableNumber: 'T7', capacity: 2, status: 'available' },
        { tableNumber: 'T8', capacity: 4, status: 'available' },
        { tableNumber: 'T9', capacity: 6, status: 'available' },
        { tableNumber: 'T10', capacity: 8, status: 'available' }
      ]);
    } else {
    }
    // Only disconnect if we created our own connection
    if (!reuseConnection && conn) {
      await mongoose.disconnect();
    }

    return true;
  } catch (error) {
    console.error('Error seeding data:', error.message);
    return false;
  }
};

module.exports = seedProduction;

// Run if executed directly
seedProduction();
