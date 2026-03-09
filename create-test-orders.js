const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Test order data for each branch
const testOrders = [
  // SAPTHALA.MAIN - Order 1
  {
    customer: { name: 'Rajesh Kumar', phone: '9876543210', address: 'Hyderabad, Telangana' },
    garmentType: 'Business Shirt',
    measurements: { C: '38', SH: '16', L: '28' },
    designNotes: 'Blue formal shirt with white collar',
    pricing: { total: 1200, advance: 600, balance: 600 },
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.MAIN',
    workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.MAIN - Order 2
  {
    customer: { name: 'Priya Sharma', phone: '9876543211', address: 'Hyderabad, Telangana' },
    garmentType: 'Designer Lehenga',
    measurements: { LL: '42', LW: '28', B: '36' },
    designNotes: 'Red and gold designer lehenga with heavy embroidery',
    pricing: { total: 3500, advance: 1750, balance: 1750 },
    deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.MAIN',
    workflow: ['dyeing', 'cutting', 'stitching', 'maggam', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.KPHB - Order 1
  {
    customer: { name: 'Amit Patel', phone: '9876543212', address: 'KPHB, Hyderabad' },
    garmentType: 'Wedding Sherwani',
    measurements: { C: '40', SH: '17', L: '30', W: '34' },
    designNotes: 'Cream colored sherwani with golden work',
    pricing: { total: 3500, advance: 1750, balance: 1750 },
    deliveryDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.KPHB',
    workflow: ['dyeing', 'cutting', 'stitching', 'khakha', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.KPHB - Order 2
  {
    customer: { name: 'Sneha Reddy', phone: '9876543213', address: 'KPHB, Hyderabad' },
    garmentType: 'Party Frock',
    measurements: { FL: '38', B: '34', W: '30' },
    designNotes: 'Pink party frock with sequin work',
    pricing: { total: 2400, advance: 1200, balance: 1200 },
    deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.KPHB',
    workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.JNTU - Order 1
  {
    customer: { name: 'Vikram Singh', phone: '9876543214', address: 'JNTU, Hyderabad' },
    garmentType: 'Formal Trouser',
    measurements: { PL: '40', PW: '32' },
    designNotes: 'Black formal trouser with slim fit',
    pricing: { total: 1000, advance: 500, balance: 500 },
    deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.JNTU',
    workflow: ['cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.JNTU - Order 2
  {
    customer: { name: 'Ananya Iyer', phone: '9876543215', address: 'JNTU, Hyderabad' },
    garmentType: 'Silk Kurthi',
    measurements: { KL: '36', B: '34', W: '30' },
    designNotes: 'Green silk kurthi with golden border',
    pricing: { total: 850, advance: 425, balance: 425 },
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.JNTU',
    workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.ECIL - Order 1
  {
    customer: { name: 'Mohammed Ali', phone: '9876543216', address: 'ECIL, Hyderabad' },
    garmentType: 'Men Kurta',
    measurements: { KL: '38', C: '40', W: '36' },
    designNotes: 'White kurta with embroidery on collar',
    pricing: { total: 800, advance: 400, balance: 400 },
    deliveryDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.ECIL',
    workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  },
  // SAPTHALA.ECIL - Order 2
  {
    customer: { name: 'Lakshmi Devi', phone: '9876543217', address: 'ECIL, Hyderabad' },
    garmentType: 'Churidar Suit',
    measurements: { KL: '40', B: '36', W: '32' },
    designNotes: 'Blue churidar suit with dupatta',
    pricing: { total: 1150, advance: 575, balance: 575 },
    deliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    branch: 'SAPTHALA.ECIL',
    workflow: ['dyeing', 'cutting', 'stitching', 'finishing', 'quality-check', 'ready-to-deliver']
  }
];

async function createTestOrders() {
  console.log('🚀 Starting test order creation...\n');
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < testOrders.length; i++) {
    const order = testOrders[i];
    console.log(`📦 Creating Order ${i + 1}/${testOrders.length}`);
    console.log(`   Customer: ${order.customer.name}`);
    console.log(`   Branch: ${order.branch}`);
    console.log(`   Garment: ${order.garmentType}`);
    console.log(`   Amount: ₹${order.pricing.total}`);
    
    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(order)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`   ✅ SUCCESS - Order ID: ${result.order.orderId}`);
        console.log(`   📋 Workflow: ${result.order.workflowTasks.length} tasks created`);
        successCount++;
      } else {
        console.log(`   ❌ FAILED - ${result.error || 'Unknown error'}`);
        failCount++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}`);
      failCount++;
    }
    
    console.log('');
    
    // Small delay between orders
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('========================================');
  console.log('📊 SUMMARY');
  console.log('========================================');
  console.log(`✅ Successful: ${successCount}/${testOrders.length}`);
  console.log(`❌ Failed: ${failCount}/${testOrders.length}`);
  console.log(`📈 Success Rate: ${Math.round((successCount / testOrders.length) * 100)}%`);
  console.log('========================================\n');
  
  if (successCount === testOrders.length) {
    console.log('🎉 ALL TEST ORDERS CREATED SUCCESSFULLY!');
    console.log('✅ Order creation flow is working perfectly across all branches!');
  } else {
    console.log('⚠️ Some orders failed. Please check the errors above.');
  }
}

// Run the test
createTestOrders().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
