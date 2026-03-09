/**
 * Load Demo Data into MongoDB for immediate dashboard preview
 * Run: node scripts/load-demo-data.js
 */

const mongoose = require('mongoose');
const path = require('path');

// Import database schemas
const dbPath = path.join(__dirname, '..', 'database.js');
let db;
try {
  db = require(dbPath);
} catch (e) {
  console.error('❌ Failed to load database.js:', e.message);
  process.exit(1);
}

const { Branch, Order, Staff, User } = db;

(async function run() {
  try {
    console.log('🔄 Loading demo data into MongoDB...\n');

    // 1. Create demo branch if not exists
    const branchId = 'DEMO_BRANCH_001';
    let branch = await Branch.findOne({ branchId });
    if (!branch) {
      branch = await Branch.create({
        branchId,
        branchName: 'Demo Branch - Central Store',
        location: 'Mumbai, Maharashtra',
        email: 'demo@sapthala.com',
        isActive: true
      });
      console.log('✅ Created demo branch:', branchId);
    } else {
      console.log('✅ Demo branch already exists:', branchId);
    }

    // 2. Create demo staff if not exists
    const staffMembers = [
      { staffId: 'staff_001', name: 'Rajesh Kumar', role: 'dyeing', phone: '9876543210', branch: branchId },
      { staffId: 'staff_002', name: 'Priya Sharma', role: 'cutting', phone: '9876543211', branch: branchId },
      { staffId: 'staff_003', name: 'Amit Patel', role: 'stitching', phone: '9876543212', branch: branchId },
    ];

    for (const staffData of staffMembers) {
      const exists = await Staff.findOne({ staffId: staffData.staffId });
      if (!exists) {
        await Staff.create(staffData);
        console.log(`✅ Created staff: ${staffData.staffId} - ${staffData.name}`);
      } else {
        console.log(`✅ Staff already exists: ${staffData.staffId}`);
      }
    }

    // 3. Create demo orders
    const orders = [
      {
        orderId: 'ORD-DEMO-001',
        customer: { name: 'Anita Singh', phone: '9876543220' },
        customerName: 'Anita Singh',
        customerPhone: '9876543220',
        branch: branchId,
        category: 'Saree',
        garmentType: 'Party Saree',
        totalAmount: 5000,
        advanceAmount: 2000,
        status: 'in_progress',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        orderId: 'ORD-DEMO-002',
        customer: { name: 'Priya Gupta', phone: '9876543221' },
        customerName: 'Priya Gupta',
        customerPhone: '9876543221',
        branch: branchId,
        category: 'Lehenga',
        garmentType: 'Bridal Lehenga',
        totalAmount: 15000,
        advanceAmount: 5000,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        orderId: 'ORD-DEMO-003',
        customer: { name: 'Siya Verma', phone: '9876543222' },
        customerName: 'Siya Verma',
        customerPhone: '9876543222',
        branch: branchId,
        category: 'Kurta',
        garmentType: 'Silk Kurta',
        totalAmount: 3500,
        advanceAmount: 1500,
        status: 'completed',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
      {
        orderId: 'ORD-DEMO-004',
        customer: { name: 'Neha Desai', phone: '9876543223' },
        customerName: 'Neha Desai',
        customerPhone: '9876543223',
        branch: branchId,
        category: 'Saree',
        garmentType: 'Wedding Saree',
        totalAmount: 8000,
        advanceAmount: 3000,
        status: 'in_progress',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    ];

    let createdCount = 0;
    for (const orderData of orders) {
      const exists = await Order.findOne({ orderId: orderData.orderId });
      if (!exists) {
        await Order.create(orderData);
        console.log(`✅ Created order: ${orderData.orderId} - ${orderData.customerName} (₹${orderData.totalAmount})`);
        createdCount++;
      } else {
        console.log(`✅ Order already exists: ${orderData.orderId}`);
      }
    }

    // 4. Summary stats
    const totalOrders = await Order.countDocuments({ branch: branchId });
    const totalRevenue = await Order.aggregate([
      { $match: { branch: branchId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const advanceCollected = await Order.aggregate([
      { $match: { branch: branchId } },
      { $group: { _id: null, total: { $sum: '$advanceAmount' } } }
    ]);
    const pendingOrders = await Order.countDocuments({ branch: branchId, status: 'pending' });

    console.log('\n📊 Demo Data Summary:');
    console.log(`   Branch: ${branchId}`);
    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Total Revenue: ₹${totalRevenue[0]?.total || 0}`);
    console.log(`   Advance Collected: ₹${advanceCollected[0]?.total || 0}`);
    console.log(`   Pending Orders: ${pendingOrders}`);
    console.log('\n✅ Demo data loaded successfully!');
    console.log('🌐 Now open admin panel and click "Bypass" to see dashboard data.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Demo data load failed:', error.message);
    process.exit(1);
  }
})();
