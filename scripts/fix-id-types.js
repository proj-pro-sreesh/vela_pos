const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

function toObjectId(str) {
  if (mongoose.Types.ObjectId.isValid(str)) {
    return new mongoose.Types.ObjectId(str);
  }
  return str;
}

function toDate(val) {
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }
  return val;
}

function convertDocument(doc, collectionName) {
  const converted = { ...doc };

  // Convert _id
  if (typeof converted._id === 'string') {
    converted._id = toObjectId(converted._id);
  }

  // Convert timestamps
  if (converted.createdAt && typeof converted.createdAt === 'string') {
    converted.createdAt = toDate(converted.createdAt);
  }
  if (converted.updatedAt && typeof converted.updatedAt === 'string') {
    converted.updatedAt = toDate(converted.updatedAt);
  }

  // Collection-specific field conversions
  switch (collectionName) {
    case 'tables':
      if (converted.currentOrder && typeof converted.currentOrder === 'string') {
        converted.currentOrder = toObjectId(converted.currentOrder);
      }
      break;
    case 'orders':
      if (converted.table && typeof converted.table === 'string') {
        converted.table = toObjectId(converted.table);
      }
      if (converted.waiter && typeof converted.waiter === 'string') {
        converted.waiter = toObjectId(converted.waiter);
      }
      if (converted.items && Array.isArray(converted.items)) {
        converted.items = converted.items.map(item => {
          if (item && typeof item === 'object' && item.menuItem && typeof item.menuItem === 'string') {
            return { ...item, menuItem: toObjectId(item.menuItem) };
          }
          return item;
        });
      }
      break;
    case 'menuitems':
      if (converted.category && typeof converted.category === 'string') {
        converted.category = toObjectId(converted.category);
      }
      break;
    case 'vendortransactions':
      if (converted.vendorId && typeof converted.vendorId === 'string') {
        converted.vendorId = toObjectId(converted.vendorId);
      }
      if (converted.createdBy && typeof converted.createdBy === 'string') {
        converted.createdBy = toObjectId(converted.createdBy);
      }
      break;
  }

  return converted;
}

async function fixIdTypes() {
  console.log('========================================');
  console.log('  Fixing ID Types and Date Fields');
  console.log('========================================\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = ['tables', 'orders', 'users', 'categories', 'menuitems', 'vendors', 'vendortransactions'];

    for (const collectionName of collections) {
      console.log(`Fixing ${collectionName} collection...`);
      const collection = db.collection(collectionName);
      const docs = await collection.find({}).toArray();

      if (docs.length === 0) {
        console.log(`  - Skipped (empty)`);
        continue;
      }

      const convertedDocs = docs.map(doc => convertDocument(doc, collectionName));
      await collection.drop().catch(() => {});
      await collection.insertMany(convertedDocs);

      console.log(`  - Fixed ${convertedDocs.length} documents`);
    }

    console.log('\n========================================');
    console.log('All fixes applied successfully!');
    console.log('========================================\n');
    console.log('Please restart the server to apply changes.\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixIdTypes();
