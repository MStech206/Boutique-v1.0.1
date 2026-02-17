// Run this script with: node reset-admin.js
// It will drop the users collection and exit.

const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/sapthala_boutique';

async function run() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    await mongoose.connection.db.dropCollection('users');
    console.log('✅ Dropped users collection');
  } catch (err) {
    if (err.codeName === 'NamespaceNotFound') {
      console.log('ℹ️ users collection does not exist, nothing to drop.');
    } else {
      console.error('❌ Error:', err);
    }
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

run();
