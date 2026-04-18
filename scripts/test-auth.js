const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const db = require(path.join(__dirname, '..', 'server', 'config', 'database'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vela-pos';

async function testAuth() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get a user from DB
    const user = await db.findUserByUsername('admin');
    if (!user) {
      console.log('Admin user not found!');
      process.exit(1);
    }
    console.log('Found user:', user.username, '| id:', user.id, '| _id:', user._id);

    // Simulate JWT token payload
    const decodedUserId = user.id; // This is a string from JWT
    console.log('\nSimulating JWT token with userId:', decodedUserId);

    // Test findUserById with that ID
    const foundUser = await db.findUserById(decodedUserId);
    if (foundUser) {
      console.log('✅ findUserById SUCCESS:', foundUser.username, '| isActive:', foundUser.isActive);
    } else {
      console.log('❌ findUserById FAILED - user not found');
      process.exit(1);
    }

    // Also test with ObjectId directly
    const foundUser2 = await db.findUserById(user._id);
    console.log('✅ findUserById with ObjectId:', foundUser2 ? foundUser2.username : 'FAILED');

    await mongoose.disconnect();
    console.log('\n✅ Authentication lookup works correctly!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAuth();
