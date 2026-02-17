// Create Missing Staff Members for Complete Workflow
const { connectDB, Staff } = require('./database');

async function createMissingStaff() {
    try {
        await connectDB();
        console.log('🔗 Connected to MongoDB');

        // Define all required staff for complete workflow
        const requiredStaff = [
            {
                staffId: 'staff_001',
                name: 'Rajesh Kumar',
                phone: '9876543210',
                email: 'rajesh@sapthala.com',
                role: 'Dyeing Specialist',
                pin: '1234',
                workflowStages: ['dyeing'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_002',
                name: 'Priya Sharma',
                phone: '9876543211',
                email: 'priya@sapthala.com',
                role: 'Master Cutter',
                pin: '1234',
                workflowStages: ['cutting'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_003',
                name: 'Amit Patel',
                phone: '9876543212',
                email: 'amit@sapthala.com',
                role: 'Senior Tailor',
                pin: '1234',
                workflowStages: ['stitching'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_004',
                name: 'Sneha Desai',
                phone: '9876543213',
                email: 'sneha@sapthala.com',
                role: 'Khakha Expert',
                pin: '1234',
                workflowStages: ['khakha'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_005',
                name: 'Vikram Singh',
                phone: '9876543214',
                email: 'vikram@sapthala.com',
                role: 'Maggam Artist',
                pin: '1234',
                workflowStages: ['maggam'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_006',
                name: 'Kavya Reddy',
                phone: '9876543215',
                email: 'kavya@sapthala.com',
                role: 'Painting Artist',
                pin: '1234',
                workflowStages: ['painting'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_007',
                name: 'Ravi Kumar',
                phone: '9876543216',
                email: 'ravi@sapthala.com',
                role: 'Finishing Expert',
                pin: '1234',
                workflowStages: ['finishing'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_008',
                name: 'Meera Nair',
                phone: '9876543217',
                email: 'meera@sapthala.com',
                role: 'Quality Controller',
                pin: '1234',
                workflowStages: ['quality-check'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_009',
                name: 'Suresh Babu',
                phone: '9876543218',
                email: 'suresh@sapthala.com',
                role: 'Delivery Executive',
                pin: '1234',
                workflowStages: ['ready-to-deliver'],
                isAvailable: true,
                currentTaskCount: 0
            },
            {
                staffId: 'staff_010',
                name: 'Design Team Lead',
                phone: '9876543219',
                email: 'design@sapthala.com',
                role: 'Design Coordinator',
                pin: '1234',
                workflowStages: ['measurements-design'],
                isAvailable: true,
                currentTaskCount: 0
            }
        ];

        console.log('👥 Creating/updating staff members...');

        for (const staffData of requiredStaff) {
            const existing = await Staff.findOne({ staffId: staffData.staffId });
            
            if (existing) {
                // Update existing staff
                await Staff.findOneAndUpdate(
                    { staffId: staffData.staffId },
                    { $set: staffData },
                    { new: true }
                );
                console.log(`✅ Updated: ${staffData.name} (${staffData.staffId})`);
            } else {
                // Create new staff
                const newStaff = new Staff(staffData);
                await newStaff.save();
                console.log(`🆕 Created: ${staffData.name} (${staffData.staffId})`);
            }
        }

        console.log('🎉 All staff members created/updated successfully!');
        console.log('📋 Staff Summary:');
        
        const allStaff = await Staff.find().sort({ staffId: 1 });
        allStaff.forEach(staff => {
            console.log(`   ${staff.staffId}: ${staff.name} - ${staff.workflowStages.join(', ')}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating staff:', error);
        process.exit(1);
    }
}

createMissingStaff();