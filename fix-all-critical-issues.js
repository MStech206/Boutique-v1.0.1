const { connectDB, Staff, Order, Settings, User } = require('./database');

async function fixAllCriticalIssues() {
    try {
        console.log('🔧 Starting comprehensive system fixes...');
        
        await connectDB();
        
        // 1. Ensure admin user exists
        const adminUser = await User.findOne({ username: 'admin' });
        if (!adminUser) {
            console.log('❌ Admin user missing, creating...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Admin user created');
        }
        
        // 2. Fix staff data - ensure 10 staff members with correct roles
        const staffData = [
            { staffId: 'staff_001', name: 'Rajesh Kumar', role: 'Dyeing Specialist', workflowStages: ['dyeing'], pin: '1234' },
            { staffId: 'staff_002', name: 'Priya Sharma', role: 'Master Cutter', workflowStages: ['cutting'], pin: '1234' },
            { staffId: 'staff_003', name: 'Amit Patel', role: 'Senior Tailor', workflowStages: ['stitching'], pin: '1234' },
            { staffId: 'staff_004', name: 'Sneha Desai', role: 'Khakha Expert', workflowStages: ['khakha'], pin: '1234' },
            { staffId: 'staff_005', name: 'Vikram Singh', role: 'Maggam Artist', workflowStages: ['maggam'], pin: '1234' },
            { staffId: 'staff_006', name: 'Kavya Reddy', role: 'Painting Artist', workflowStages: ['painting'], pin: '1234' },
            { staffId: 'staff_007', name: 'Ravi Kumar', role: 'Finishing Expert', workflowStages: ['finishing'], pin: '1234' },
            { staffId: 'staff_008', name: 'Meera Nair', role: 'Quality Controller', workflowStages: ['quality-check'], pin: '1234' },
            { staffId: 'staff_009', name: 'Suresh Babu', role: 'Delivery Executive', workflowStages: ['ready-to-deliver'], pin: '1234' },
            { staffId: 'staff_010', name: 'Arjun Reddy', role: 'Design Specialist', workflowStages: ['measurements-design'], pin: '1234' }
        ];
        
        // Clear existing staff and recreate
        await Staff.deleteMany({});
        console.log('🗑️ Cleared existing staff');
        
        for (const staff of staffData) {
            await Staff.create({
                ...staff,
                phone: '9876543210',
                email: `${staff.staffId}@sapthala.com`,
                isAvailable: true,
                currentTaskCount: 0
            });
        }
        console.log('✅ Created 10 staff members');
        
        // 3. Ensure workflow settings exist
        const settings = await Settings.findOne();
        if (!settings || !settings.workflowStages) {
            console.log('⚙️ Creating workflow settings...');
            const workflowStages = [
                { id: 'measurements-design', name: 'Measurements & Design', icon: '📐', order: 1 },
                { id: 'dyeing', name: 'Dyeing', icon: '🎨', order: 2 },
                { id: 'cutting', name: 'Cutting', icon: '✂️', order: 3 },
                { id: 'stitching', name: 'Stitching', icon: '🧵', order: 4 },
                { id: 'khakha', name: 'Khakha', icon: '✨', order: 5 },
                { id: 'maggam', name: 'Maggam', icon: '🌟', order: 6 },
                { id: 'painting', name: 'Painting', icon: '🎭', order: 7 },
                { id: 'finishing', name: 'Finishing', icon: '✨', order: 8 },
                { id: 'quality-check', name: 'Quality Check', icon: '🔍', order: 9 },
                { id: 'ready-to-deliver', name: 'Ready to Deliver', icon: '📦', order: 10 }
            ];
            
            await Settings.findOneAndUpdate(
                {},
                {
                    companyName: 'SAPTHALA Designer Workshop',
                    phone: '7794021608',
                    email: 'sapthalaredddydesigns@gmail.com',
                    address: 'Hyderabad, India',
                    workflowStages
                },
                { upsert: true }
            );
            console.log('✅ Workflow settings created');
        }
        
        console.log('🎉 All critical issues fixed successfully!');
        console.log('📊 System Status:');
        console.log(`   - Staff Members: ${await Staff.countDocuments()}`);
        console.log(`   - Admin User: ${await User.countDocuments()}`);
        console.log(`   - Settings: ${await Settings.countDocuments()}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

fixAllCriticalIssues();