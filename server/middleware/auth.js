const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorised' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_dev');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user || !req.user.isActive) return res.status(401).json({ message: 'User not found or deactivated' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid' });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};
