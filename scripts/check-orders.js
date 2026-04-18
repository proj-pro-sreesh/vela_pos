const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Order = require(path.join(__dirname, '..', 'server', 'models', 'Order'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function checkOrders() {
  try {
    await mongoose.connect(MONGODB_URI);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    console.log('Now:', now.toISOString());
    console.log('Today start:', todayStart.toISOString());
    console.log('Today end:', todayEnd.toISOString());
    console.log('');

    const orders = await Order.find({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    }).sort({ orderNumber: 1 });

    console.log("Today's orders:");
    orders.forEach(o => {
      console.log(`  ${o.orderNumber} | ${o._id.toString()} | ${o.status} | ${o.createdAt.toISOString()}`);
    });
    console.log(`Total: ${orders.length}`);

    // Also check all orders with today's date pattern in orderNumber
    const todayStr = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}`;
    const pattern = new RegExp(`ORD-${todayStr}-`);
    const allWithTodayNum = await Order.find({ orderNumber: { $regex: pattern } });
    console.log(`\nAll orders with today's number pattern (${todayStr}):`);
    allWithTodayNum.forEach(o => {
      console.log(`  ${o.orderNumber} | ${o.createdAt.toISOString()} | ${o.status}`);
    });
    console.log(`Total: ${allWithTodayNum.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

checkOrders();
