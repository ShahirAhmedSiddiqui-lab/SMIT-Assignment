const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  resetTokenHash: String,
  resetTokenExpiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
