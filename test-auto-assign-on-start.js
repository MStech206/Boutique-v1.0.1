const { connectDB, Order, Staff } = require('./database');
const DataFlowService = require('./services/dataFlowService');

async function testAutoAssignOnStart() {
  try {
    console.log('🧪 Test: Auto-assign when starting an unassigned task');
    await connectDB();

    const staff = await Staff.findOne({ workflowStages: 'dyeing', isAvailable: true });
    if (!staff) {
      console.warn('⚠️ No dyeing staff found; skipping auto-assign test');
      process.exit(0);
    }

    const orderId = `AUTO-ASSIGN-${Date.now()}`;
    const order = new Order({
      orderId,
      customerName: 'AutoAssign Tester',
      customerPhone: '+919111111111',
      garmentType: 'Test',
      totalAmount: 100,
      branch: staff.branch || 'SAPTHALA.MAIN',
      status: 'pending',
      currentStage: 'dyeing',
      workflowTasks: [
        { stageId: 'dyeing', stageName: 'Dyeing', status: 'pending', createdAt: new Date(), updatedAt: new Date() }
      ]
    });

    await order.save();

    const beforeCount = staff.currentTaskCount || 0;

    // Staff starts the unassigned task — service should auto-assign
    const res = await DataFlowService.processStaffTaskUpdate(staff.staffId, orderId, 'dyeing', { status: 'started' });
    if (!res || !res.success) throw new Error('processStaffTaskUpdate did not succeed');

    const updated = await Order.findOne({ orderId });
    const task = updated.workflowTasks.find(t => t.stageId === 'dyeing');

    if (!task.assignedTo) throw new Error('Task was not auto-assigned');
    if (task.assignedTo.toString() !== staff._id.toString()) throw new Error('Task assignedTo does not match staff who started it');

    const refreshedStaff = await Staff.findById(staff._id);
    if ((refreshedStaff.currentTaskCount || 0) !== beforeCount + 1) throw new Error('Staff currentTaskCount was not incremented on auto-assign');

    console.log('✅ Auto-assign on start behavior is correct');

    // Cleanup
    await Order.deleteOne({ orderId });
    refreshedStaff.currentTaskCount = Math.max(0, refreshedStaff.currentTaskCount - 1);
    await refreshedStaff.save();

    process.exit(0);
  } catch (err) {
    console.error('❌ Auto-assign test failed:', err);
    process.exit(1);
  }
}

if (require.main === module) testAutoAssignOnStart();

module.exports = { testAutoAssignOnStart };