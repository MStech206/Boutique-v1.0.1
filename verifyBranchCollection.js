const mongoose = require('mongoose');
const { Branch } = require('./database');

const MONGO_URI = 'mongodb://localhost:27017/sapthala_boutique';

const verifyBranchCollection = async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const branches = await Branch.find();
    if (branches.length === 0) {
      console.log('No branches found in the collection.');
    } else {
      console.log('Branches found in the collection:', branches);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error verifying Branch collection:', error);
  }
};

verifyBranchCollection();