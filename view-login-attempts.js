const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/sapthala_boutique';

const loginAttemptSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: String,
  success: { type: Boolean, required: true },
  errorMessage: String,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now }
});

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

async function viewLoginAttempts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const attempts = await LoginAttempt.find()
      .sort({ timestamp: -1 })
      .limit(20);

    console.log('📊 LOGIN ATTEMPTS (Last 20)\n');
    console.log('='.repeat(100));

    if (attempts.length === 0) {
      console.log('No login attempts found in database.');
    } else {
      attempts.forEach((attempt, index) => {
        const status = attempt.success ? '✅ SUCCESS' : '❌ FAILED';
        const time = new Date(attempt.timestamp).toLocaleString();
        
        console.log(`\n${index + 1}. ${status}`);
        console.log(`   Username: ${attempt.username}`);
        console.log(`   Time: ${time}`);
        if (!attempt.success) {
          console.log(`   Error: ${attempt.errorMessage || 'Unknown error'}`);
        }
        console.log(`   IP: ${attempt.ipAddress || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(100));

    const stats = {
      total: await LoginAttempt.countDocuments(),
      successful: await LoginAttempt.countDocuments({ success: true }),
      failed: await LoginAttempt.countDocuments({ success: false })
    };

    console.log('\n📈 STATISTICS');
    console.log(`   Total Attempts: ${stats.total}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Success Rate: ${stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : 0}%`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

viewLoginAttempts();
