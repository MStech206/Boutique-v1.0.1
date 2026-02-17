const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/sapthala_boutique';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'sub-admin'], default: 'admin' },
  branch: String,
  permissions: {
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageStaff: { type: Boolean, default: true },
    branchAccess: [String]
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', userSchema);

async function changeAdminPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const newPassword = '1234';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await User.findOneAndUpdate(
      { username: 'admin' },
      { password: hashedPassword },
      { new: true }
    );

    if (result) {
      console.log('✅ Admin password changed successfully!');
      console.log('📋 New credentials:');
      console.log('   Username: admin');
      console.log('   Password: 1234');
      
      // Verify the password works
      const isValid = await bcrypt.compare(newPassword, result.password);
      console.log('🔍 Password verification:', isValid ? '✅ VALID' : '❌ INVALID');
    } else {
      console.log('❌ Admin user not found');
    }

    await mongoose.connection.close();
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

changeAdminPassword();
