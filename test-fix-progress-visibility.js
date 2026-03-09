const { connectDB, Order, Staff, Notification } = require('./database');
const DataFlowService = require('./services/dataFlowService');

async function testProgressionVisibility() {
  try {
    console.log('🔧 Running regression test: progression visibility (dyeing -> cutting)');
    await connectDB();

    // Ensure we have at least one dyeing staff and one cutting staff
    const dyeStaff = await Staff.findOne({ workflowStages: 'dyeing', isAvailable: true });
    const cutStaff = await Staff.findOne({ workflowStages: 'cutting', isAvailable: true });

    if (!dyeStaff || !cutStaff) {
      console.warn('⚠️ Missing test staff (dyeing/cutting). Aborting this test.');
      process.exit(0);
    }

    // Create a fresh test order with two stages: dyeing -> cutting
    const testOrderId = `REG-${Date.now()}`;
    const order = new Order({
      orderId: testOrderId,
      customerName: 'Reg Test',
      customerPhone: '+919000000000',
      garmentType: 'Test Garment',
      measurements: { B: 36 },
      totalAmount: 1000,
      branch: dyeStaff.branch || 'SAPTHALA.MAIN',
      status: 'pending',
      currentStage: 'dyeing',
      workflowTasks: [
        { stageId: 'dyeing', stageName: 'Dyeing', status: 'assigned', assignedTo: dyeStaff._id, assignedToName: dyeStaff.name, createdAt: new Date(), updatedAt: new Date() },
        { stageId: 'cutting', stageName: 'Cutting', status: 'waiting', createdAt: new Date(), updatedAt: new Date() }
      ]
    });

    // Save and ensure dyeStaff workload reflects assignment
    await order.save();
    dyeStaff.currentTaskCount = (dyeStaff.currentTaskCount || 0) + 1;
    await dyeStaff.save();

    console.log(`   Created test order ${testOrderId} assigned to ${dyeStaff.name}`);

    // Now complete the dyeing task via the service (simulates staff action)
    const completeResult = await DataFlowService.processStaffTaskUpdate(dyeStaff.staffId, testOrderId, 'dyeing', { status: 'completed', notes: 'regression test' });
    if (!completeResult || !completeResult.success) throw new Error('Failed to complete dyeing task in test');

    // Fetch tasks for cutting staff and ensure the order appears in availableTasks OR assigned
    const cuttingTasks = await DataFlowService.getStaffTasks(cutStaff.staffId, true);
    const found = cuttingTasks.availableTasks.concat(cuttingTasks.myTasks).some(t => t.orderId === testOrderId && (t.status === 'pending' || t.status === 'assigned'));

    if (!found) {
      console.error('❌ Regression failed: next-stage (cutting) not visible/assigned to cutting staff');
      process.exit(1);
    }

    console.log('✅ Regression passed: next-stage became visible/assigned to cutting staff');

    // Cleanup: remove test order and restore staff counts
    await Order.deleteOne({ orderId: testOrderId });
    dyeStaff.currentTaskCount = Math.max(0, dyeStaff.currentTaskCount - 1);
    await dyeStaff.save();

    process.exit(0);
  } catch (err) {
    console.error('❌ Test error:', err);
    process.exit(1);
  }
}

if (require.main === module) testProgressionVisibility();

module.exports = { testProgressionVisibility };