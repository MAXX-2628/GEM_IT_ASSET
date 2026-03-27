const mongoose = require('mongoose');

// Shared models across all branches
let User;
let Branch;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ Master MongoDB Connected: ${conn.connection.host}`);

    // Initialize Master Models
    const UserSchema = require('../models/User').schema;
    const BranchSchema = require('../models/Branch').schema;
    const SettingsSchema = require('../models/Settings').schema;

    User = mongoose.model('User', UserSchema);
    Branch = mongoose.model('Branch', BranchSchema);
    Settings = mongoose.model('Settings', SettingsSchema);

    console.log('✅ Master Models Initialized: User, Branch, Settings');

  } catch (error) {
    console.error(`❌ Master MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  get User() { return User; },
  get Branch() { return Branch; },
  get Settings() { return Settings; }
};
