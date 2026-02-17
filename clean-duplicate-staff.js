const { connectDB, Staff } = require('./database');

async function cleanDuplicateStaff() {
    try {
        console.log('🧹 Starting duplicate staff cleanup...');
        await connectDB();
        
        // Get all staff
        const allStaff = await Staff.find({});
        console.log(`📊 Total staff in database: ${allStaff.length}`);
        
        // Group by staffId to find duplicates
        const staffGroups = {};
        allStaff.forEach(staff => {
            if (!staffGroups[staff.staffId]) {
                staffGroups[staff.staffId] = [];
            }
            staffGroups[staff.staffId].push(staff);
        });
        
        // Find and remove duplicates
        let duplicatesRemoved = 0;
        for (const [staffId, staffList] of Object.entries(staffGroups)) {
            if (staffList.length > 1) {
                console.log(`🔍 Found ${staffList.length} duplicates for staffId: ${staffId}`);
                
                // Keep the most recent one (by createdAt)
                const sortedStaff = staffList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                const keepStaff = sortedStaff[0];
                const removeStaff = sortedStaff.slice(1);
                
                console.log(`   ✅ Keeping: ${keepStaff.name} (${keepStaff._id}) - Created: ${keepStaff.createdAt}`);
                
                for (const staff of removeStaff) {
                    console.log(`   ❌ Removing: ${staff.name} (${staff._id}) - Created: ${staff.createdAt}`);
                    await Staff.findByIdAndDelete(staff._id);
                    duplicatesRemoved++;
                }
            }
        }
        
        // Final count
        const finalCount = await Staff.countDocuments();
        console.log(`✅ Cleanup complete!`);
        console.log(`   Duplicates removed: ${duplicatesRemoved}`);
        console.log(`   Final staff count: ${finalCount}`);
        
        // List all remaining staff
        const remainingStaff = await Staff.find({}).sort({ staffId: 1 });
        console.log('\n📋 Remaining staff members:');
        remainingStaff.forEach(staff => {
            console.log(`   ${staff.staffId}: ${staff.name} - ${staff.role} (${staff.workflowStages.join(', ')})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning duplicates:', error);
        process.exit(1);
    }
}

cleanDuplicateStaff();