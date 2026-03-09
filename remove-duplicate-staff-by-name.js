const mongoose = require('mongoose');
const { Staff, connectDB } = require('./database');

async function removeDuplicateStaffByName() {
  try {
    await connectDB();
    console.log('🔧 Removing duplicate staff by name and branch...\n');

    const allStaff = await Staff.find().sort({ createdAt: 1 });
    const seen = new Map(); // key: "name-branch", value: staffId
    let removed = 0;

    for (const member of allStaff) {
      const key = `${member.name}-${member.branch}`;
      
      if (seen.has(key)) {
        // Duplicate found - remove it
        await Staff.deleteOne({ _id: member._id });
        removed++;
        console.log(`  ❌ Removed duplicate: ${member.name} (${member.staffId}) from ${member.branch}`);
      } else {
        seen.set(key, member.staffId);
        console.log(`  ✅ Kept: ${member.name} (${member.staffId}) from ${member.branch}`);
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Removed: ${removed} duplicate staff`);
    console.log(`   Remaining: ${seen.size} unique staff`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeDuplicateStaffByName();
