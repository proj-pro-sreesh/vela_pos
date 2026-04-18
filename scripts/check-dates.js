const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function checkDates() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // Check one order
    const order = await db.collection('orders').findOne({});
    console.log('Order createdAt type:', typeof order.createdAt);
    console.log('Is Date object?', order.createdAt instanceof Date);
    console.log('createdAt value:', order.createdAt);

    // Query for today's orders using Date objects
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    console.log('\nQuery range:');
    console.log('  from:', todayStart.toISOString());
    console.log('  to:', todayEnd.toISOString());

    const todayOrders = await db.collection('orders').find({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    }).toArray();

    console.log('\nOrders found with date query:', todayOrders.length);
    todayOrders.forEach(o => {
      console.log(' ', o.orderNumber, o.createdAt.toISOString());
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

checkDates();
