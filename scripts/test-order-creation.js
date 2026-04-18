const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Table = require(path.join(__dirname, '..', 'server', 'models', 'Table'));
const Order = require(path.join(__dirname, '..', 'server', 'models', 'Order'));
const db = require(path.join(__dirname, '..', 'server', 'config', 'database'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function testOrderCreation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get a table
    const table = await Table.findOne({});
    if (!table) {
      console.log('No tables found in database!');
      process.exit(1);
    }
    console.log('Found table:', table.tableNumber, 'ID:', table._id.toString());

    // Test createOrder
    console.log('\nTesting order creation...');
    const order = await db.createOrder({
      tableId: table._id.toString(),
      tableNumber: table.tableNumber,
      isTakeaway: false,
      items: [
        { menuItemId: '69d2030b2b9301107ea7f8a2', name: 'Paneer Butter Masala', quantity: 1, price: 250 }
      ],
      subtotal: 250,
      total: 250
    });

    console.log('\nOrder created successfully!');
    console.log('Order Number:', order.orderNumber);
    console.log('Order ID:', order._id || order.id);
    console.log('Table:', order.table);
    console.log('Status:', order.status);

    // Clean up - delete the test order
    if (order._id) {
      await Order.findByIdAndDelete(order._id);
      console.log('\nTest order cleaned up.');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testOrderCreation();
