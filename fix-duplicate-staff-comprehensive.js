const { connectDB, Staff, Branch, Order } = require('./database');

// Roles to remove completely
const ROLES_TO_REMOVE = ['measuring', 'designing', 'measurements', 'design', 'measurements-design'];

// Valid workflow stages (excluding measuring and designing)
const VALID_WORKFLOW_STAGES = [
  'dyeing', 'cutting', 'stitching', 'khakha', 'maggam',
  'painting', 'finishing', 'quality_check', 'quality-check', 'delivery'
];

// Valid staff roles
const VALID_STAFF_ROLES = [
  'dyeing', 'cutting', 'stitching', 'khakha', 'maggam',
  'painting', 'finishing', 'quality_check', 'delivery'
];

async function fixDuplicateStaffComprehensive() {
  try {
    console.log('🔧 COMPREHENSIVE DUPLICATE STAFF FIX\n');
    console.log('=' .repeat(60));
    
    const mongoConnected = await connectDB();
    if (!mongoConnected) {
      console.error('❌ MongoDB connection failed');
      process.exit(1);
    }

    // ========== STEP 1: REMOVE INVALID ROLES ==========
    console.log('\n📋 STEP 1: Removing invalid roles (measuring, designing)...');
    const invalidStaff = await Staff.find({ role: { $in: ROLES_TO_REMOVE } });
    if (invalidStaff.length > 0) {
      for (const staff of invalidStaff) {
        await Staff.findByIdAndDelete(staff._id);
        console.log(`   ❌ Removed: ${staff.name} (${staff.staffId}) - Role: ${staff.role}`);
      }
      console.log(`   ✅ Total removed: ${invalidStaff.length}`);
    } else {
      console.log('   ✅ No invalid roles found');
    }

    // ========== STEP 2: REMOVE DUPLICATES PER BRANCH/ROLE ==========
    console.log('\n📋 STEP 2: Removing duplicates (only one staff per role per branch)...');
    
    // Get all valid staff
    const allStaff = await Staff.find({ role: { $in: VALID_STAFF_ROLES } }).sort({ createdAt: 1 });
    
    // Group by branch + role
    const groupedByBranchRole = {};
    for (const staff of allStaff) {
      const branchId = staff.branch || 'SAPTHALA.MAIN';
      const key = `${branchId}|${staff.role}`;
      if (!groupedByBranchRole[key]) {
        groupedByBranchRole[key] = [];
      }
      groupedByBranchRole[key].push(staff);
    }

    let duplicatesRemoved = 0;
    
    // For each group, keep first and delete others
    for (const [key, staffList] of Object.entries(groupedByBranchRole)) {
      if (staffList.length > 1) {
        const [branch, role] = key.split('|');
        console.log(`\n   Branch: ${branch}, Role: ${role}`);
        console.log(`   ✅ Keeping: ${staffList[0].name} (${staffList[0].staffId})`);
        
        // Delete all except the first (oldest by createdAt)
        for (let i = 1; i < staffList.length; i++) {
          await Staff.findByIdAndDelete(staffList[i]._id);
          console.log(`   🗑️ Removed: ${staffList[i].name} (${staffList[i].staffId})`);
          duplicatesRemoved++;
        }
      }
    }
    
    if (duplicatesRemoved > 0) {
      console.log(`\n   Total duplicates removed: ${duplicatesRemoved}`);
    } else {
      console.log('   ✅ No duplicates found');
    }

    // ========== STEP 3: CLEAN UP WORKFLOW STAGES ==========
    console.log('\n📋 STEP 3: Cleaning up workflow stages in staff records...');
    
    let stagesRemoved = 0;
    const staffToUpdate = await Staff.find({ workflowStages: { $exists: true, $ne: [] } });
    
    for (const staff of staffToUpdate) {
      const originalStages = [...staff.workflowStages];
      
      // Filter out invalid stages
      staff.workflowStages = staff.workflowStages.filter(stage => 
        VALID_WORKFLOW_STAGES.includes(stage.toLowerCase())
      );

      if (originalStages.length !== staff.workflowStages.length) {
        const removed = originalStages.filter(s => !staff.workflowStages.includes(s));
        console.log(`   🔄 Updated: ${staff.name} (${staff.staffId})`);
        console.log(`      Removed: ${removed.join(', ')}`);
        stagesRemoved += removed.length;
        await staff.save();
      }
    }

    if (stagesRemoved > 0) {
      console.log(`\n   Total workflow stages removed: ${stagesRemoved}`);
    } else {
      console.log('   ✅ All workflow stages are valid');
    }

    // ========== STEP 4: CLEAN UP ORDER WORKFLOW TASKS ==========
    console.log('\n📋 STEP 4: Cleaning up order workflow tasks...');
    
    let ordersUpdated = 0;
    const orders = await Order.find({ workflowTasks: { $exists: true, $ne: [] } });
    
    for (const order of orders) {
      let updated = false;
      
      // Remove measuring and designing tasks from workflow
      const originalLength = order.workflowTasks.length;
      order.workflowTasks = order.workflowTasks.filter(task => {
        const stageName = (task.stageName || '').toLowerCase();
        const stageId = (task.stageId || '').toLowerCase();
        
        const isInvalid = ROLES_TO_REMOVE.some(role => 
          stageName.includes(role) || stageId.includes(role)
        );
        
        return !isInvalid;
      });
      
      if (order.workflowTasks.length !== originalLength) {
        console.log(`   🔄 Updated: Order ${order.orderId}`);
        console.log(`      Tasks removed: ${originalLength - order.workflowTasks.length}`);
        ordersUpdated++;
        await order.save();
        updated = true;
      }
    }

    if (ordersUpdated > 0) {
      console.log(`\n   Total orders updated: ${ordersUpdated}`);
    } else {
      console.log('   ✅ No invalid workflow tasks found in orders');
    }

    // ========== STEP 5: VERIFY FINAL STATE ==========
    console.log('\n📋 STEP 5: Final verification...');
    
    const finalStaff = await Staff.find().lean();
    const staffPerBranch = {};
    
    for (const staff of finalStaff) {
      const branch = staff.branch || 'SAPTHALA.MAIN';
      if (!staffPerBranch[branch]) {
        staffPerBranch[branch] = {};
      }
      if (!staffPerBranch[branch][staff.role]) {
        staffPerBranch[branch][staff.role] = [];
      }
      staffPerBranch[branch][staff.role].push(staff);
    }

    console.log('\n📊 FINAL STAFF BREAKDOWN:\n');
    for (const [branch, roles] of Object.entries(staffPerBranch)) {
      console.log(`   📍 Branch: ${branch}`);
      for (const [role, staffList] of Object.entries(roles)) {
        if (staffList.length > 1) {
          console.log(`      ⚠️ ${role}: ${staffList.length} staff (DUPLICATES DETECTED!)`);
          staffList.forEach(s => console.log(`         - ${s.name} (${s.staffId})`));
        } else {
          console.log(`      ✅ ${role}: ${staffList[0].name} (${staffList[0].staffId})`);
        }
      }
    }

    // ========== SUMMARY ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPREHENSIVE FIX COMPLETE\n');
    console.log(`📊 Summary:`);
    console.log(`   Total staff: ${finalStaff.length}`);
    console.log(`   Total branches: ${Object.keys(staffPerBranch).length}`);
    console.log(`   Invalid roles removed: ${invalidStaff.length}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   Workflow stages cleaned: ${stagesRemoved}`);
    console.log(`   Orders updated: ${ordersUpdated}`);
    console.log('\n' + '='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDuplicateStaffComprehensive();
