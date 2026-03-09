const FirebaseService = require('./firebase-service');

async function testFirebaseConnection() {
  try {
    console.log('🔄 Testing Firebase connection...');
    
    const firebaseService = new FirebaseService();
    
    // Test 1: Get branches
    console.log('\n📍 Testing branches...');
    const branches = await firebaseService.getBranches();
    console.log(`✅ Found ${branches.length} branches`);
    
    // Test 2: Get staff
    console.log('\n👥 Testing staff...');
    const staff = await firebaseService.getStaff();
    console.log(`✅ Found ${staff.length} staff members`);
    
    // Test 3: Get orders
    console.log('\n📦 Testing orders...');
    const orders = await firebaseService.getOrders(null, 10);
    console.log(`✅ Found ${orders.length} orders`);
    
    // Test 4: Dashboard stats
    console.log('\n📊 Testing dashboard stats...');
    const stats = await firebaseService.getDashboardStats();
    console.log('✅ Dashboard stats:', stats);
    
    console.log('\n🎉 All Firebase tests passed!');
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    
    if (error.code === 'app/invalid-credential') {
      console.log('\n💡 Solution: Make sure firebase-service-account.json is in the correct location');
    }
    
    if (error.code === 'permission-denied') {
      console.log('\n💡 Solution: Check Firestore security rules');
    }
  }
}

// Run test
if (require.main === module) {
  testFirebaseConnection();
}

module.exports = { testFirebaseConnection };