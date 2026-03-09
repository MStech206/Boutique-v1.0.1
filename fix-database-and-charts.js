const mongoose = require('mongoose');
const { connectDB, Order, Customer, Staff, Branch } = require('./database');

async function fixDatabaseAndCharts() {
  console.log('🔧 Starting Database and Charts Fix...\n');

  try {
    // Step 1: Connect to MongoDB
    console.log('[1/5] Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected successfully\n');

    // Step 2: Verify collections exist
    console.log('[2/5] Verifying collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`   Found collections: ${collectionNames.join(', ')}`);
    console.log('✅ Collections verified\n');

    // Step 3: Check data counts
    console.log('[3/5] Checking data counts...');
    const orderCount = await Order.countDocuments();
    const customerCount = await Customer.countDocuments();
    const staffCount = await Staff.countDocuments();
    const branchCount = await Branch.countDocuments();
    
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Staff: ${staffCount}`);
    console.log(`   Branches: ${branchCount}`);
    console.log('✅ Data counts retrieved\n');

    // Step 4: Create sample data if empty
    if (orderCount === 0) {
      console.log('[4/5] Creating sample orders for charts...');
      
      const sampleOrders = [
        {
          orderId: `ORD-${Date.now()}-1`,
          customerName: 'Sample Customer 1',
          customerPhone: '9876543210',
          garmentType: 'Shirt',
          totalAmount: 1500,
          advanceAmount: 500,
          status: 'pending',
          branch: 'SAPTHALA.MAIN',
          createdAt: new Date(),
          workflowTasks: []
        },
        {
          orderId: `ORD-${Date.now()}-2`,
          customerName: 'Sample Customer 2',
          customerPhone: '9876543211',
          garmentType: 'Saree',
          totalAmount: 3000,
          advanceAmount: 1500,
          status: 'completed',
          branch: 'SAPTHALA.MAIN',
          createdAt: new Date(Date.now() - 86400000),
          workflowTasks: []
        },
        {
          orderId: `ORD-${Date.now()}-3`,
          customerName: 'Sample Customer 3',
          customerPhone: '9876543212',
          garmentType: 'Kurta',
          totalAmount: 2000,
          advanceAmount: 1000,
          status: 'in_progress',
          branch: 'SAPTHALA.MAIN',
          createdAt: new Date(Date.now() - 172800000),
          workflowTasks: []
        }
      ];

      await Order.insertMany(sampleOrders);
      console.log(`✅ Created ${sampleOrders.length} sample orders\n`);
    } else {
      console.log('[4/5] Sample data already exists, skipping...\n');
    }

    // Step 5: Verify chart data
    console.log('[5/5] Preparing chart data...');
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderId totalAmount createdAt garmentType status');
    
    console.log(`   Recent orders for charts: ${recentOrders.length}`);
    
    // Calculate revenue by date
    const revenueByDate = {};
    recentOrders.forEach(order => {
      const date = order.createdAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + (order.totalAmount || 0);
    });
    
    console.log('   Revenue by date:', revenueByDate);
    
    // Calculate orders by category
    const ordersByCategory = {};
    recentOrders.forEach(order => {
      const category = order.garmentType || 'Other';
      ordersByCategory[category] = (ordersByCategory[category] || 0) + 1;
    });
    
    console.log('   Orders by category:', ordersByCategory);
    console.log('✅ Chart data prepared\n');

    console.log('🎉 DATABASE AND CHARTS FIX COMPLETE!\n');
    console.log('Next steps:');
    console.log('1. Start the server: node server.js');
    console.log('2. Open http://localhost:3000');
    console.log('3. Charts should now display properly\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the fix
fixDatabaseAndCharts();
