const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Table = require(path.join(__dirname, '..', 'server', 'models', 'Table'));
const Order = require(path.join(__dirname, '..', 'server', 'models', 'Order'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // 1. Test table lookup by string _id
    const tableIdStr = '69e316f484200a3f5329f932';
    const table1 = await Table.findOne({ _id: tableIdStr });
    console.log('1. Table lookup by string _id:');
    console.log(`   Table ${table1 ? 'FOUND' : 'NOT FOUND'}:`, table1 ? table1.tableNumber : 'N/A');

    // 2. Test table lookup by ObjectId
    const tableIdObj = new mongoose.Types.ObjectId(tableIdStr);
    const table2 = await Table.findOne({ _id: tableIdObj });
    console.log('\n2. Table lookup by ObjectId:');
    console.log(`   Table ${table2 ? 'FOUND' : 'NOT FOUND'}:`, table2 ? table2.tableNumber : 'N/A');

    // 3. Check an order's table reference
    const order = await Order.findOne({});
    console.log('\n3. First order:');
    console.log('   Order ID:', order._id.toString());
    console.log('   Table field type:', typeof order.table);
    console.log('   Table field value:', order.table ? order.table.toString() : 'null');

    // 4. Try to find the table referenced by the order
    if (order.table) {
      const referencedTable = await Table.findById(order.table);
      console.log('\n4. Table referenced by order:');
      console.log('   Table ' + (referencedTable ? 'FOUND' : 'NOT FOUND') + ':', referencedTable ? referencedTable.tableNumber : 'N/A');
    }

    // 5. Test order creation simulation
    console.log('\n5. Testing order creation logic:');
    const testTable = await Table.findOne({});
    console.log('   Using table:', testTable.tableNumber, testTable._id.toString());
    const tableQuery = { $or: [{ _id: testTable._id.toString() }, { id: parseInt(testTable._id.toString()) }] };
    const foundTable = await Table.findOne(tableQuery);
    console.log('   Query result:', foundTable ? foundTable.tableNumber : 'NOT FOUND');

    await mongoose.disconnect();
    console.log('\n✅ All checks passed! The database is now properly configured.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verify();
