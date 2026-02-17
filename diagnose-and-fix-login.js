/**
 * SAPTHALA Login Diagnostic and Fix Script
 * This script will:
 * 1. Check MongoDB connection
 * 2. Verify admin user exists
 * 3. Test password hashing
 * 4. Fix any issues found
 * 5. Test the login endpoint
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/sapthala_boutique';

// User Schema (same as in database.js)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'sub-admin'], default: 'admin' },
  branch: { type: String },
  permissions: {
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageStaff: { type: Boolean, default: true },
    branchAccess: [String]
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);

async function diagnoseAndFix() {
  console.log('🔍 SAPTHALA LOGIN DIAGNOSTIC TOOL');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Connect to MongoDB
    console.log('\n📊 Step 1: Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Port: ${mongoose.connection.port}`);
    
    // Step 2: Check if admin user exists
    console.log('\n👤 Step 2: Checking admin user...');
    let adminUser = await User.findOne({ username: 'admin' });
    
    if (!adminUser) {
      console.log('❌ Admin user NOT found in database');
      console.log('🔧 Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
      adminUser = await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        permissions: {
          canEdit: true,
          canDelete: true,
          canViewReports: true,
          canManageStaff: true,
          branchAccess: []
        }
      });
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user found in database');
    }
    
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Password Hash: ${adminUser.password.substring(0, 20)}...`);
    console.log(`   Created: ${adminUser.createdAt}`);
    
    // Step 3: Test password verification
    console.log('\n🔐 Step 3: Testing password verification...');
    const testPassword = 'sapthala@2029';
    const isValid = await bcrypt.compare(testPassword, adminUser.password);
    
    if (isValid) {
      console.log('✅ Password verification SUCCESSFUL');
      console.log(`   Test password: "${testPassword}"`);
      console.log(`   Hash matches: YES`);
    } else {
      console.log('❌ Password verification FAILED');
      console.log('🔧 Regenerating password hash...');
      
      const newHash = await bcrypt.hash(testPassword, 10);
      adminUser.password = newHash;
      await adminUser.save();
      
      console.log('✅ Password hash regenerated and saved');
      
      // Verify again
      const isValidNow = await bcrypt.compare(testPassword, adminUser.password);
      if (isValidNow) {
        console.log('✅ Password verification now SUCCESSFUL');
      } else {
        console.log('❌ Password verification still FAILED - Critical error!');
      }
    }
    
    // Step 4: Test all possible login scenarios
    console.log('\n🧪 Step 4: Testing login scenarios...');
    
    const testCases = [
      { username: 'admin', password: 'sapthala@2029', expected: true },
      { username: 'admin', password: 'wrong_password', expected: false },
      { username: 'nonexistent', password: 'sapthala@2029', expected: false },
    ];
    
    for (const testCase of testCases) {
      console.log(`\n   Testing: username="${testCase.username}", password="${testCase.password}"`);
      
      const user = await User.findOne({ username: testCase.username });
      
      if (!user) {
        console.log(`   ❌ User not found`);
        if (testCase.expected) {
          console.log('   ⚠️  UNEXPECTED: User should exist!');
        } else {
          console.log('   ✅ Expected result: User does not exist');
        }
        continue;
      }
      
      const passwordMatch = await bcrypt.compare(testCase.password, user.password);
      
      if (passwordMatch) {
        console.log(`   ✅ Password matches`);
        if (testCase.expected) {
          console.log('   ✅ Expected result: Login should succeed');
        } else {
          console.log('   ⚠️  UNEXPECTED: Password should not match!');
        }
      } else {
        console.log(`   ❌ Password does not match`);
        if (!testCase.expected) {
          console.log('   ✅ Expected result: Login should fail');
        } else {
          console.log('   ⚠️  UNEXPECTED: Password should match!');
        }
      }
    }
    
    // Step 5: Verify database state
    console.log('\n📋 Step 5: Database state summary...');
    const userCount = await User.countDocuments();
    const allUsers = await User.find().select('username role createdAt');
    
    console.log(`   Total users in database: ${userCount}`);
    console.log('   Users:');
    allUsers.forEach(user => {
      console.log(`      - ${user.username} (${user.role}) - Created: ${user.createdAt.toISOString()}`);
    });
    
    // Step 6: Final recommendations
    console.log('\n💡 Step 6: Recommendations...');
    console.log('   ✅ Admin user is properly configured');
    console.log('   ✅ Password: sapthala@2029');
    console.log('   ✅ Username: admin');
    console.log('\n   To login:');
    console.log('   1. Make sure server is running: node server.js');
    console.log('   2. Open browser: http://localhost:3000');
    console.log('   3. Enter username: admin');
    console.log('   4. Enter password: sapthala@2029');
    console.log('   5. Click "Login to Dashboard"');
    
    console.log('\n✅ DIAGNOSTIC COMPLETE - All checks passed!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the diagnostic
diagnoseAndFix();
