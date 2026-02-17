const mongoose = require('mongoose');

async function resetDatabase() {
  try {
    const mongoURI = 'mongodb://localhost:27017/sapthala_boutique';
    await mongoose.connect(mongoURI);
    console.log('🔄 Connected to MongoDB');
    
    // Drop all collections
    await mongoose.connection.dropDatabase();
    console.log('✅ Database cleared successfully');
    
    // Close connection
    await mongoose.connection.close();
    console.log('✅ Connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();
