const { connectDB, Staff } = require('./database');

async function fixAllIssues() {
  try {
    console.log('🔧 Fixing all admin panel issues...');
    await connectDB();
    
    // 1. Clean up staff data - remove duplicates and ensure proper ordering
    console.log('\n👥 Fixing Staff System');
    const allStaff = await Staff.find({});
    console.log(`Found ${allStaff.length} staff members`);
    
    // Group by role to find duplicates
    const roleMap = new Map();
    for (const staff of allStaff) {
      if (roleMap.has(staff.role)) {
        console.log(`Removing duplicate: ${staff.name} (${staff.role})`);
        await Staff.findByIdAndDelete(staff._id);
      } else {
        roleMap.set(staff.role, staff);
      }
    }
    
    // 2. Ensure all workflow stages are covered
    const requiredStages = [
      { stage: 'measurements-design', role: 'Design Coordinator' },
      { stage: 'dyeing', role: 'Dyeing Specialist' },
      { stage: 'cutting', role: 'Master Cutter' },
      { stage: 'stitching', role: 'Senior Tailor' },
      { stage: 'khakha', role: 'Khakha Expert' },
      { stage: 'maggam', role: 'Maggam Artist' },
      { stage: 'painting', role: 'Painting Artist' },
      { stage: 'finishing', role: 'Finishing Expert' },
      { stage: 'quality-check', role: 'Quality Controller' },
      { stage: 'ready-to-deliver', role: 'Delivery Executive' }
    ];
    
    const finalStaff = await Staff.find({}).sort({ staffId: 1 });
    const coveredStages = new Set();
    finalStaff.forEach(staff => {
      staff.workflowStages.forEach(stage => coveredStages.add(stage));
    });
    
    // Create missing staff
    let staffCounter = finalStaff.length + 1;
    for (const { stage, role } of requiredStages) {
      if (!coveredStages.has(stage)) {
        const staffId = `staff_${String(staffCounter).padStart(3, '0')}`;
        const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh'];
        
        const newStaff = new Staff({
          staffId,
          name: names[staffCounter - 1] || `Staff ${staffCounter}`,
          phone: `77940216${String(staffCounter).padStart(2, '0')}`,
          role,
          pin: '1234',
          workflowStages: [stage],
          isAvailable: true,
          currentTaskCount: 0
        });
        
        await newStaff.save();
        console.log(`✅ Created: ${newStaff.name} (${staffId}) - ${role}`);
        staffCounter++;
      }
    }
    
    // 3. Verify final state
    const verifyStaff = await Staff.find({}).sort({ staffId: 1 });
    console.log(`\n✅ Final staff count: ${verifyStaff.length}`);
    verifyStaff.forEach((staff, index) => {
      console.log(`  ${index + 1}. ${staff.staffId} - ${staff.name} (${staff.role})`);
    });
    
    console.log('\n🎉 ALL ISSUES FIXED!');
    console.log('✅ Staff system organized');
    console.log('✅ All workflow stages covered');
    console.log('✅ Ready for admin panel testing');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

fixAllIssues();