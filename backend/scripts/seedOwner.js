const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env or current directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const Admin = require('../models/Admin');
const Tenant = require('../models/Tenant');

async function seedOwner() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/safestreets';
  
  try {
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // 1. Upsert DEFAULT tenant
    let defaultTenant = await Tenant.findOne({ code: 'DEFAULT' });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        name: 'Default Tenant',
        code: 'DEFAULT',
        description: 'Primary default organization tenant',
        active: true,
        settings: {
          maxFieldWorkers: 100,
          maxAdmins: 50
        }
      });
      console.log('✅ Created DEFAULT tenant:', defaultTenant._id.toString());
    } else {
      defaultTenant.active = true;
      await defaultTenant.save();
      console.log('✅ DEFAULT tenant exists:', defaultTenant._id.toString());
    }

    // 2. Upsert Tenant Owner
    const ownerEmail = process.env.OWNER_EMAIL || 'owner@safestreets.com';
    const ownerPassword = process.env.OWNER_PASSWORD || 'ownerpassword123';

    let owner = await Admin.findOne({ email: ownerEmail });
    if (!owner) {
      owner = await Admin.create({
        name: 'Tenant Owner',
        email: ownerEmail,
        password: ownerPassword,
        role: 'tenant-owner',
        tenant: defaultTenant._id
      });
      console.log(`✅ Created new tenant-owner: ${owner.email} (${owner._id})`);
    } else {
      owner.role = 'tenant-owner';
      owner.tenant = defaultTenant._id;
      owner.password = ownerPassword; // Pre-save hook will hash modified password
      await owner.save();
      console.log(`✅ Updated existing user ${owner.email} to tenant-owner (${owner._id})`);
    }

    console.log('🎉 Seeding completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedOwner();
