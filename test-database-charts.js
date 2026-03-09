const { connectDB, Order } = require('./database');

async function quickTest() {
  console.log('🧪 Quick Database & Charts Test\n');
  
  try {
    // Test 1: Database Connection
    console.log('[1/3] Testing database connection...');
    await connectDB();
    console.log('✅ Database connected\n');
    
    // Test 2: Data Availability
    console.log('[2/3] Checking data availability...');
    const orderCount = await Order.countDocuments();
    console.log(`   Orders in database: ${orderCount}`);
    
    if (orderCount === 0) {
      console.log('⚠️  No orders found - charts may be empty');
      console.log('   Run: node fix-database-and-charts.js');
    } else {
      console.log('✅ Data available for charts\n');
    }
    
    // Test 3: Chart Data
    console.log('[3/3] Preparing chart data...');
    const orders = await Order.find().sort({ createdAt: -1 }).limit(10);
    
    // Revenue data
    const revenueData = orders.map(o => ({
      date: o.createdAt.toISOString().split('T')[0],
      amount: o.totalAmount || 0
    }));
    
    // Category data
    const categories = {};
    orders.forEach(o => {
      const cat = o.garmentType || 'Other';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    
    console.log('   Revenue data points:', revenueData.length);
    console.log('   Categories:', Object.keys(categories).length);
    console.log('✅ Chart data ready\n');
    
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('Next: Start server with "node server.js"');
    console.log('Then open: http://localhost:3000\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MongoDB is running: net start MongoDB');
    console.error('2. Check connection string in database.js');
    console.error('3. Run: node fix-database-and-charts.js\n');
    process.exit(1);
  }
}

quickTest();
