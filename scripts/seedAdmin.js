const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Get email and password from command line arguments or use defaults
const args = process.argv.slice(2);
const email = args[0] || process.env.ADMIN_EMAIL || 'admin@otp-sync.local';
const password = args[1] || process.env.ADMIN_PASSWORD || 'admin123456';

async function seedAdmin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email, isAdmin: true });
    if (existingAdmin) {
      console.log(`⚠ Admin user with email "${email}" already exists.`);
      console.log('  Skipping seed. To create a new admin, use a different email.');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Check if user with this email exists (but not admin)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`⚠ User with email "${email}" already exists but is not an admin.`);
      console.log('  Updating user to admin...');
      existingUser.isAdmin = true;
      await existingUser.save();
      console.log(`✓ User "${email}" has been updated to admin`);
    } else {
      // Create new admin user
      const admin = new User({
        email,
        password,
        isAdmin: true,
      });

      await admin.save();
      console.log(`✓ Admin user created successfully!`);
      console.log(`  Email: ${email}`);
      console.log(`  Password: ${password}`);
      console.log(`  isAdmin: true`);
    }

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding admin:', error.message);
    if (error.code === 11000) {
      console.error('  Email already exists in database');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedAdmin();

