const { connectDB, Staff, Settings } = require('./database');

async function fixStaffSystem() {
  try {
    console.log('🔧 Starting staff system fix...');
    await connectDB();
    
    // 1. Check current staff
    const allStaff = await Staff.find({});
    console.log(`📊 Current staff count: ${allStaff.length}`);
    
    // 2. Group by role to find duplicates
    const roleGroups = {};
    allStaff.forEach(staff => {
      if (!roleGroups[staff.role]) {
        roleGroups[staff.role] = [];
      }
      roleGroups[staff.role].push(staff);
    });
    
    console.log('\n📋 Staff by role:');
    Object.keys(roleGroups).forEach(role => {
      console.log(`  ${role}: ${roleGroups[role].length} members`);
      roleGroups[role].forEach(s => console.log(`    - ${s.name} (${s.staffId})`));
    });
    
    // 3. Delete duplicates (keep first one of each role)
    console.log('\n🗑️ Removing duplicates...');
    for (const role in roleGroups) {
      if (roleGroups[role].length > 1) {
        const toDelete = roleGroups[role].slice(1); // Keep first, delete rest
        for (const staff of toDelete) {
          console.log(`   Deleting: ${staff.name} (${staff.staffId}) - ${staff.role}`);
          await Staff.findByIdAndDelete(staff._id);
        }
      }
    }
    
    // 4. Define required workflow stages
    const requiredStages = [
      { id: 'measurements-design', name: 'Measurements & Design', role: 'Design Specialist' },
      { id: 'dyeing', name: 'Dyeing', role: 'Dyeing Specialist' },
      { id: 'cutting', name: 'Cutting', role: 'Master Cutter' },
      { id: 'stitching', name: 'Stitching', role: 'Senior Tailor' },
      { id: 'khakha', name: 'Khakha', role: 'Khakha Expert' },
      { id: 'maggam', name: 'Maggam', role: 'Maggam Artist' },
      { id: 'painting', name: 'Painting', role: 'Painting Artist' },
      { id: 'finishing', name: 'Finishing', role: 'Finishing Expert' },
      { id: 'quality-check', name: 'Quality Check', role: 'Quality Controller' },
      { id: 'ready-to-deliver', name: 'Delivery', role: 'Delivery Executive' }
    ];
    
    // 5. Check which stages are missing staff
    const remainingStaff = await Staff.find({});
    const coveredStages = new Set();
    remainingStaff.forEach(staff => {
      staff.workflowStages.forEach(stage => coveredStages.add(stage));
    });
    
    console.log('\n📊 Stage coverage:');
    const missingStages = [];
    requiredStages.forEach(stage => {
      const covered = coveredStages.has(stage.id);
      console.log(`  ${stage.name}: ${covered ? '✅' : '❌'}`);
      if (!covered) missingStages.push(stage);
    });
    
    // 6. Create staff for missing stages
    console.log('\n👥 Creating staff for missing stages...');
    let staffCounter = 1;
    for (const stage of missingStages) {
      const staffId = `staff_${String(staffCounter).padStart(3, '0')}`;
      const names = [
        'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Desai', 'Vikram Singh',
        'Kavya Reddy', 'Ravi Kumar', 'Meera Nair', 'Suresh Babu', 'Lakshmi Devi'
      ];
      
      const newStaff = new Staff({
        staffId,
        name: names[staffCounter - 1] || `Staff ${staffCounter}`,
        phone: `77940216${String(staffCounter).padStart(2, '0')}`,
        email: `${staffId}@sapthala.com`,
        role: stage.role,
        pin: '1234',
        workflowStages: [stage.id],
        isAvailable: true,
        currentTaskCount: 0
      });
      
      await newStaff.save();
      console.log(`   ✅ Created: ${newStaff.name} (${staffId}) - ${stage.role}`);
      staffCounter++;
    }
    
    // 7. Final verification
    const finalStaff = await Staff.find({}).sort({ staffId: 1 });
    console.log(`\n✅ Final staff count: ${finalStaff.length}`);
    console.log('\n📋 Complete staff list:');
    finalStaff.forEach((staff, index) => {
      console.log(`  ${index + 1}. ${staff.name} (${staff.staffId}) - ${staff.role}`);
      console.log(`     Stages: ${staff.workflowStages.join(', ')}`);
    });
    
    console.log('\n🎉 Staff system fixed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing staff system:', error);
    process.exit(1);
  }
}

fixStaffSystem();