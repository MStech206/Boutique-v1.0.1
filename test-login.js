const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sapthala_boutique')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function testLogin() {
  console.log('\n🔍 TESTING LOGIN SYSTEM\n');
  
  try {
    // Find admin user
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ Admin user not found in database');
      process.exit(1);
    }
    
    console.log('✅ Admin user found');
    console.log('   Username:', admin.username);
    console.log('   Role:', admin.role);
    console.log('   Password Hash:', admin.password.substring(0, 20) + '...');
    
    // Test correct password
    console.log('\n📝 Testing correct password: "sapthala@2029"');
    const correctPassword = await bcrypt.compare('sapthala@2029', admin.password);
    console.log('   Result:', correctPassword ? '✅ PASS' : '❌ FAIL');
    
    // Test wrong password
    console.log('\n📝 Testing wrong password: "wrongpassword"');
    const wrongPassword = await bcrypt.compare('wrongpassword', admin.password);
    console.log('   Result:', wrongPassword ? '❌ FAIL (should be false)' : '✅ PASS (correctly rejected)');
    
    // Test empty password
    console.log('\n📝 Testing empty password: ""');
    const emptyPassword = await bcrypt.compare('', admin.password);
    console.log('   Result:', emptyPassword ? '❌ FAIL (should be false)' : '✅ PASS (correctly rejected)');
    
    console.log('\n✅ ALL TESTS COMPLETED\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

testLogin();
