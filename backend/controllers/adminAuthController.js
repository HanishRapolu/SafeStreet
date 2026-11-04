const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { cacheUserToken, invalidateToken } = require('../utils/jwtCache');

// Login Admin
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Find admin with tenant data
    const admin = await Admin.findOne({ email }).populate('tenant');
    console.log('Login attempt for:', email);
    console.log('Admin found:', admin ? 'yes' : 'no');
    
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials - admin not found' });
    }
    
    const isMatch = await admin.matchPassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials - password mismatch' });
    }
    
    // Check if tenant is active
    if (admin.tenant && !admin.tenant.active) {
      return res.status(403).json({ message: 'Your tenant account is inactive. Please contact the system administrator.' });
    }

    // Update last active timestamp
    admin.profile = admin.profile || {};
    admin.profile.lastActive = Date.now();
    await admin.save();

    const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Cache token in Redis for faster validation
    await cacheUserToken(admin._id.toString(), token, 60 * 60); // 1 hour
    
    // Return admin data (excluding password)
    const adminData = {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      profile: admin.profile || {}
    };
    
    // Add tenant info if exists
    if (admin.tenant) {
      adminData.tenant = {
        _id: admin.tenant._id,
        name: admin.tenant.name,
        code: admin.tenant.code,
        settings: admin.tenant.settings
      };
    }
    
    res.status(200).json({ token, admin: adminData });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Logout Admin
const logoutAdmin = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Invalidate token in Redis
    await invalidateToken(token);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Validate token endpoint
const validateToken = async (req, res) => {
  return res.status(200).json({ 
    valid: true,
    message: 'Token is valid',
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      tenant: req.admin.tenant ? {
        _id: req.admin.tenant._id,
        name: req.admin.tenant.name,
        code: req.admin.tenant.code
      } : null
    }
  });
};

module.exports = {
  loginAdmin,
  logoutAdmin,
  validateToken
};
