const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Table = require(path.join(__dirname, '..', 'server', 'models', 'Table'));
const Order = require(path.join(__dirname, '..', 'server', 'models', 'Order'));
const db = require(path.join(__dirname, '..', 'server', 'config', 'database'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function testFullOrder() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get a table and a menu item
    const table = await Table.findOne({});
    const menuItems = await mongoose.connection.db.collection('menuitems').find({}).toArray();
    const menuItem = menuItems[0];

    if (!table || !menuItem) {
      console.log('Missing prerequisites - ensure tables and menu items exist');
      process.exit(1);
    }

    console.log('Using table:', table.tableNumber, '(' + table._id.toString() + ')');
    console.log('Using menu item:', menuItem.name, '(' + menuItem._id.toString() + ')');

    // Prepare order data
    const orderData = {
      tableId: table._id.toString(),
      tableNumber: table.tableNumber,
      isTakeaway: false,
      items: [
        {
          menuItemId: menuItem._id.toString(),
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price
        }
      ],
      subtotal: menuItem.price,
      discount: 0,
      discountType: 'percentage',
      total: menuItem.price,
      notes: 'Test order'
    };

    console.log('\nCreating order...');
    const order = await db.createOrder(orderData);

    console.log('\n✅ Order created successfully!');
    console.log('Order Number:', order.orderNumber);
    console.log('Order ID:', order._id || order.id);
    console.log('Table:', order.tableNumber);
    console.log('Status:', order.status);
    console.log('Payment Status:', order.paymentStatus);

    // Verify order exists in DB
    const found = await Order.findById(order._id || order.id);
    console.log('\nVerification - Order in DB:', found ? 'YES' : 'NO');
    if (found) {
      console.log('Order table field:', found.table ? found.table.toString() : 'null');
    }

    // Clean up
    if (order._id) {
      await Order.findByIdAndDelete(order._id);
      console.log('Test order deleted.');
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFullOrder();
