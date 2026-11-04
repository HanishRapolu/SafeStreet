const express = require('express');
const { protectAdmin, restrictTo } = require('../middleware/adminAuthMiddleware');
const Admin = require('../models/Admin');
const FieldWorker = require('../models/FieldWorker');

const router = express.Router();

// Protect all routes with admin authentication
router.use(protectAdmin);

// ================= ADMIN MANAGEMENT (tenant-owner only) =================

// GET /api/admin/team/admins - List admins in own tenant
router.get('/admins', restrictTo('tenant-owner'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const admins = await Admin.find({ tenant: tenantId })
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/team/admins - Create admin in own tenant
router.post('/admins', restrictTo('tenant-owner'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: 'admin',
      tenant: tenantId
    });

    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      tenant: admin.tenant
    };

    res.status(201).json(adminData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/team/admins/:adminId - Update admin in own tenant
router.put('/admins/:adminId', restrictTo('tenant-owner'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { adminId } = req.params;
    const { name, email, password } = req.body;

    const admin = await Admin.findOne({ _id: adminId, tenant: tenantId });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password) admin.password = password;

    await admin.save();

    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      tenant: admin.tenant
    };

    res.status(200).json(adminData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/team/admins/:adminId - Delete admin in own tenant
router.delete('/admins/:adminId', restrictTo('tenant-owner'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { adminId } = req.params;

    // Cannot delete self
    if (adminId === req.admin._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const admin = await Admin.findOne({ _id: adminId, tenant: tenantId });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    // Cannot delete the last owner
    if (admin.role === 'tenant-owner') {
      const ownerCount = await Admin.countDocuments({ tenant: tenantId, role: 'tenant-owner' });
      if (ownerCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last tenant owner' });
      }
    }

    await Admin.deleteOne({ _id: adminId });
    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ================= FIELD WORKER MANAGEMENT (owner and admin) =================

// GET /api/admin/team/field-workers - List field workers in own tenant
router.get('/field-workers', restrictTo('tenant-owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const workers = await FieldWorker.find({ tenant: tenantId })
      .select('-password')
      .sort({ createdAt: -1 });
    res.status(200).json(workers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/admin/team/field-workers - Create field worker in own tenant
router.post('/field-workers', restrictTo('tenant-owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { name, workerId, specialization, region } = req.body;

    if (!name || !workerId) {
      return res.status(400).json({ message: 'Name and worker ID are required' });
    }

    const existingWorker = await FieldWorker.findOne({ workerId });
    if (existingWorker) {
      return res.status(400).json({ message: 'Field worker with this ID already exists' });
    }

    const email = `${workerId.toLowerCase()}@safestreets.com`;
    const generatedPassword = `${workerId}${Math.floor(1000 + Math.random() * 9000)}`;

    const fieldWorker = await FieldWorker.create({
      name,
      workerId,
      email,
      password: generatedPassword,
      specialization,
      region,
      tenant: tenantId
    });

    const workerData = {
      _id: fieldWorker._id,
      name: fieldWorker.name,
      workerId: fieldWorker.workerId,
      email: fieldWorker.email,
      specialization: fieldWorker.specialization,
      region: fieldWorker.region,
      generatedPassword
    };

    res.status(201).json(workerData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/admin/team/field-workers/:workerId - Update field worker in own tenant
router.put('/field-workers/:workerId', restrictTo('tenant-owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { workerId } = req.params;
    const { name, email, password, phone, specialization, region, active } = req.body;

    const fieldWorker = await FieldWorker.findOne({ _id: workerId, tenant: tenantId });
    if (!fieldWorker) {
      return res.status(404).json({ message: 'Field worker not found' });
    }

    if (name) fieldWorker.name = name;
    if (email) fieldWorker.email = email;
    if (password) fieldWorker.password = password;
    if (phone !== undefined) fieldWorker.phone = phone;
    if (specialization) fieldWorker.specialization = specialization;
    if (region) fieldWorker.region = region;
    if (active !== undefined) fieldWorker.active = active;

    await fieldWorker.save();

    const workerData = {
      _id: fieldWorker._id,
      name: fieldWorker.name,
      workerId: fieldWorker.workerId,
      email: fieldWorker.email,
      phone: fieldWorker.phone,
      specialization: fieldWorker.specialization,
      region: fieldWorker.region,
      active: fieldWorker.active,
      tenant: fieldWorker.tenant
    };

    res.status(200).json(workerData);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/admin/team/field-workers/:workerId - Delete field worker in own tenant
router.delete('/field-workers/:workerId', restrictTo('tenant-owner', 'admin'), async (req, res) => {
  try {
    const tenantId = req.admin.tenant._id || req.admin.tenant;
    const { workerId } = req.params;

    const fieldWorker = await FieldWorker.findOne({ _id: workerId, tenant: tenantId });
    if (!fieldWorker) {
      return res.status(404).json({ message: 'Field worker not found' });
    }

    await FieldWorker.deleteOne({ _id: workerId });
    res.status(200).json({ message: 'Field worker deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
