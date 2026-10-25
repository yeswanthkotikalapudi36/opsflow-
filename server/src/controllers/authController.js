const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        onCallStatus: user.onCallStatus,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login.' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, title } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || 'engineer',
      title: title || 'Site Reliability Engineer',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(user);
    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        onCallStatus: user.onCallStatus,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, error: 'Error registering user.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        onCallStatus: user.onCallStatus,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error fetching profile.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const safeUsers = (Array.isArray(users) ? users : users.results || []).map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      avatar: u.avatar,
      onCallStatus: u.onCallStatus,
    }));
    return res.json({ success: true, users: safeUsers });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Error fetching users.' });
  }
};
