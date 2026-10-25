const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['sre', 'incident_commander', 'tech_lead', 'engineer', 'viewer', 'admin'],
    default: 'engineer',
  },
  title: {
    type: String,
    default: 'Site Reliability Engineer',
  },
  avatar: {
    type: String,
    default: '',
  },
  phone: {
    type: String,
    default: '+1 (555) 234-5678',
  },
  onCallStatus: {
    isOnCall: { type: Boolean, default: false },
    tier: { type: Number, default: 1 }, // 1 = Primary, 2 = Secondary
    shiftEnd: { type: Date },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
