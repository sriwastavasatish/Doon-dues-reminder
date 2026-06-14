const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = id =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'ddr_dev_secret_change_in_prod', { expiresIn: '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive)
      return res.status(401).json({ message: 'Invalid credentials or account disabled' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

// POST /api/auth/seed-admin  — creates first admin if none exists
router.post('/seed-admin', async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'admin' });
    if (count > 0)
      return res.status(400).json({ message: 'Admin already exists. Use login.' });

    const admin = await User.create({
      name:     'Super Admin',
      email:    'admin@doondueskreminder.com',
      password: 'Admin@1234',
      role:     'admin',
    });
    res.json({
      message:  '✅ Admin created successfully!',
      email:    admin.email,
      password: 'Admin@1234',
      note:     'Please change your password after first login.',
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ message: 'Current password incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
