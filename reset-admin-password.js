const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/sapthala_boutique';

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    role: String,
    email: String,
    branch: String,
    permissions: Object,
    isActive: Boolean
});

const User = mongoose.model('User', userSchema);

async function resetAdminPassword() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('sapthala@2029', 10);
        
        // Update or create admin user
        const result = await User.findOneAndUpdate(
            { username: 'admin' },
            {
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                email: 'admin@sapthala.com',
                permissions: {
                    canEdit: true,
                    canDelete: true,
                    canViewReports: true,
                    canManageStaff: true,
                    canManageAdmins: true
                },
                isActive: true
            },
            { upsert: true, new: true }
        );

        console.log('✅ Admin password reset successfully');
        console.log('   Username: admin');
        console.log('   Password: sapthala@2029');
        console.log('   Role:', result.role);

        // Also create super-admin if not exists
        const superHashedPassword = await bcrypt.hash('superadmin@2029', 10);
        const superResult = await User.findOneAndUpdate(
            { username: 'superadmin' },
            {
                username: 'superadmin',
                password: superHashedPassword,
                role: 'super-admin',
                email: 'superadmin@sapthala.com',
                permissions: {
                    canEdit: true,
                    canDelete: true,
                    canViewReports: true,
                    canManageStaff: true,
                    canManageAdmins: true
                },
                isActive: true
            },
            { upsert: true, new: true }
        );

        console.log('✅ Super admin created/updated');
        console.log('   Username: superadmin');
        console.log('   Password: superadmin@2029');
        console.log('   Role:', superResult.role);

        await mongoose.disconnect();
        console.log('\n✅ Done! You can now login with:');
        console.log('   Admin: admin / sapthala@2029');
        console.log('   Super Admin: superadmin / superadmin@2029');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

resetAdminPassword();
