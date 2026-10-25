const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Service } = require('../models');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token: User not found or session expired.',
      });
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      avatar: user.avatar,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed. Invalid or expired token.',
    });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId);
      if (user) {
        req.user = {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          title: user.title,
          avatar: user.avatar,
        };
      }
    }
  } catch (err) {
    // Ignore error in optional auth
  }
  next();
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
    });
  };
}

// Verify webhook service key
async function verifyServiceWebhookKey(req, res, next) {
  const serviceKey = req.params.serviceKey || req.headers['x-opsflow-service-key'];
  if (!serviceKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required serviceKey in URL or x-opsflow-service-key header.',
    });
  }

  const service = await Service.findOne({ key: serviceKey.toLowerCase().trim() });
  if (!service) {
    return res.status(404).json({
      success: false,
      error: `Service with key '${serviceKey}' not found in OpsFlow catalog. Register the service first.`,
    });
  }

  req.service = service;
  next();
}

module.exports = {
  authMiddleware,
  optionalAuth,
  requireRole,
  verifyServiceWebhookKey,
};
