const mongoose = require('mongoose');
const { connectDB, Staff } = require('./database');

async function fixStaffWorkflowStages() {
  try {
    await connectDB();
    
    console.log('\n🔧 Checking Staff Workflow Stages\n');
    console.log('='.repeat(50));
    
    const staff = await Staff.find();
    console.log(`\nFound ${staff.length} staff members\n`);
    
    let fixed = 0;
    
    for (const s of staff) {
      console.log(`\n${s.name} (${s.staffId}):`);
      console.log(`  Current stages: ${s.workflowStages.join(', ') || 'NONE'}`);
      console.log(`  Available: ${s.isAvailable}`);
      
      if (!s.workflowStages || s.workflowStages.length === 0) {
        console.log(`  ❌ NO WORKFLOW STAGES ASSIGNED!`);
        
        // Assign default stage based on role
        const roleMap = {
          'Design Coordinator': ['measurements-design'],
          'Dyeing Specialist': ['dyeing'],
          'Master Cutter': ['cutting'],
          'Senior Tailor': ['stitching'],
          'Khakha Expert': ['khakha'],
          'Maggam Artist': ['maggam'],
          'Painting Artist': ['painting'],
          'Finishing Expert': ['finishing'],
          'Quality Controller': ['quality-check'],
          'Delivery Executive': ['ready-to-deliver']
        };
        
        const stages = roleMap[s.role] || [];
        if (stages.length > 0) {
          s.workflowStages = stages;
          await s.save();
          console.log(`  ✅ FIXED: Assigned ${stages.join(', ')}`);
          fixed++;
        }
      } else {
        console.log(`  ✅ OK`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Fixed ${fixed} staff members`);
    console.log('\nAll staff now have workflow stages assigned!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixStaffWorkflowStages();
