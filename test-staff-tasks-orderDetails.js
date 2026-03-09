const { connectDB, Staff } = require('./database');
const DataFlowService = require('./services/dataFlowService');

async function testOrderDetailsPresence() {
  try {
    console.log('🔎 Test: staff tasks include orderDetails object');
    await connectDB();

    const staff = await Staff.findOne();
    if (!staff) {
      console.warn('⚠️ No staff found. Skipping test.');
      process.exit(0);
    }

    const result = await DataFlowService.getStaffTasks(staff.staffId, true);
    const tasks = (result.myTasks || []).concat(result.availableTasks || []);

    if (tasks.length === 0) {
      console.log('   ⚠️ No tasks available for this staff. Test passes by default.');
      process.exit(0);
    }

    const invalid = tasks.filter(t => !t.orderDetails || typeof t.orderDetails !== 'object');
    if (invalid.length > 0) {
      console.error('❌ Some tasks are missing orderDetails:', invalid.slice(0,3));
      process.exit(1);
    }

    console.log('✅ All returned tasks include `orderDetails` object');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

if (require.main === module) testOrderDetailsPresence();

module.exports = { testOrderDetailsPresence };