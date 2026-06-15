const router = require('express').Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, assignedClasses } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });
    const user = await User.create({ name, email, password, role, assignedClasses, createdBy: req.user._id });
    res.status(201).json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true });
    if (password) { user.password = password; await user.save(); }
    res.json({ user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
