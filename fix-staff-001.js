const {connectDB, Staff} = require('./database');

async function fixStaff001() {
  await connectDB();
  
  const staff = await Staff.findOne({staffId: 'staff_001'});
  
  console.log('\nCurrent assignment:');
  console.log(`  ${staff.name}: ${staff.workflowStages.join(', ')}`);
  
  // Add measurements-design to staff_001 so he can see first-stage tasks
  staff.workflowStages = ['measurements-design', 'dyeing'];
  staff.role = 'Design Coordinator & Dyeing Specialist';
  await staff.save();
  
  console.log('\nNew assignment:');
  console.log(`  ${staff.name}: ${staff.workflowStages.join(', ')}`);
  console.log('\n✅ Staff_001 can now see tasks immediately!\n');
  
  process.exit(0);
}

fixStaff001();
