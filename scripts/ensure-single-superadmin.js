const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sapthala_boutique';

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);

(async function() {
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Find all super-admins
    const supers = await User.find({ role: 'super-admin' });
    if (supers.length === 0) {
      // create default
      const hashed = await bcrypt.hash('superadmin@2029', 10);
      const u = await User.create({ username: 'superadmin', email: 'superadmin@sapthala.com', password: hashed, role: 'super-admin', isActive: true });
      console.log('Created default superadmin: superadmin / superadmin@2029');
    } else if (supers.length === 1) {
      // ensure credentials
      const s = supers[0];
      const hashed = await bcrypt.hash('superadmin@2029', 10);
      s.password = hashed;
      s.email = s.email || 'superadmin@sapthala.com';
      s.isActive = true;
      await s.save();
      console.log('Ensured single superadmin exists and password set: superadmin@2029 (username may vary: ' + s.username + ')');
      // If username is not 'superadmin', rename it to 'superadmin' if unique
      if (s.username !== 'superadmin') {
        const conflict = await User.findOne({ username: 'superadmin' });
        if (!conflict) {
          s.username = 'superadmin';
          await s.save();
          console.log('Renamed existing super-admin to username: superadmin');
        } else {
          console.log('Username superadmin already exists for another user; not renaming.');
        }
      }
    } else {
      // More than one super admin - remove extras and keep one
      // Keep the one with username 'superadmin' if exists
      let keeper = supers.find(s => s.username === 'superadmin');
      if (!keeper) keeper = supers[0];

      // Set keeper password
      keeper.password = await bcrypt.hash('superadmin@2029', 10);
      keeper.email = keeper.email || 'superadmin@sapthala.com';
      keeper.isActive = true;
      keeper.username = 'superadmin';
      await keeper.save();

      // Remove other super-admins
      const toRemove = supers.filter(s => s._id.toString() !== keeper._id.toString());
      const ids = toRemove.map(t => t._id);
      if (ids.length) {
        await User.deleteMany({ _id: { $in: ids } });
        console.log('Removed extra super-admin accounts:', ids.join(', '));
      }
      console.log('Ensured single superadmin (username: superadmin) and password set to superadmin@2029');
    }

    await mongoose.disconnect();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();