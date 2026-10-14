const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { requireAuth, cookieOptions } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/mailer');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumPasswordLength = 8;

function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function safeMessage(value) { return typeof value === 'string' ? value : ''; }
function renderForm(res, view, data = {}) {
  return res.render(view, { title: data.title || 'Anchor Auth', error: '', success: '', message: '', email: '', ...data });
}

router.get('/signup', (req, res) => renderForm(res, 'signup', { title: 'Create account' }));

router.post('/signup', async (req, res, next) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  if (!emailPattern.test(email)) return renderForm(res, 'signup', { title: 'Create account', error: 'Enter a valid email address.', email });
  if (password.length < minimumPasswordLength) return renderForm(res, 'signup', { title: 'Create account', error: `Password must be at least ${minimumPasswordLength} characters.`, email });
  if (password !== confirmPassword) return renderForm(res, 'signup', { title: 'Create account', error: 'Passwords do not match.', email });

  try {
    const existing = await User.findOne({ email }).lean();
    if (existing) return renderForm(res, 'signup', { title: 'Create account', error: 'An account with that email already exists.', email });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    res.cookie('auth_token', token, cookieOptions());
    res.redirect('/dashboard');
  } catch (error) { next(error); }
});

router.get('/login', (req, res) => renderForm(res, 'login', { title: 'Log in', message: safeMessage(req.query.message) }));

router.post('/login', async (req, res, next) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || '');
  try {
    const user = await User.findOne({ email });
    const valid = user && await bcrypt.compare(password, user.passwordHash);
    if (!valid) return renderForm(res, 'login', { title: 'Log in', error: 'Email or password is incorrect.', email });
    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '2h' });
    res.cookie('auth_token', token, cookieOptions());
    res.redirect('/dashboard');
  } catch (error) { next(error); }
});

router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', cookieOptions());
  res.redirect('/login?message=You%20have%20been%20logged%20out.');
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

router.get('/forgot-password', (req, res) => renderForm(res, 'forgot-password', { title: 'Reset password' }));

router.post('/forgot-password', async (req, res, next) => {
  const email = cleanEmail(req.body.email);
  try {
    const user = await User.findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const minutes = Number(process.env.RESET_TOKEN_MINUTES || 15);
      user.resetTokenHash = resetTokenHash;
      user.resetTokenExpiresAt = new Date(Date.now() + minutes * 60 * 1000);
      await user.save();
      const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      await sendPasswordResetEmail(email, `${baseUrl}/reset-password/${rawToken}`);
    }
    return renderForm(res, 'forgot-password', { title: 'Reset password', success: 'If an account exists for that email, a reset link is on its way.' });
  } catch (error) { next(error); }
});

router.get('/reset-password/:token', async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: new Date() } }).lean();
    if (!user) return renderForm(res, 'error', { title: 'Reset link expired', message: 'This reset link is invalid or has expired.' });
    res.render('reset-password', { title: 'Choose a new password', token: req.params.token, error: '', success: '', message: '' });
  } catch (error) { next(error); }
});

router.post('/reset-password/:token', async (req, res, next) => {
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const formData = { title: 'Choose a new password', token: req.params.token, error: '', success: '' };
  if (password.length < minimumPasswordLength) return renderForm(res, 'reset-password', { ...formData, error: `Password must be at least ${minimumPasswordLength} characters.` });
  if (password !== confirmPassword) return renderForm(res, 'reset-password', { ...formData, error: 'Passwords do not match.' });
  try {
    const user = await User.findOne({ resetTokenHash: tokenHash, resetTokenExpiresAt: { $gt: new Date() } });
    if (!user) return renderForm(res, 'error', { title: 'Reset link expired', message: 'This reset link is invalid or has expired.' });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();
    res.redirect('/login?message=Your%20password%20was%20updated.%20Please%20log%20in.');
  } catch (error) { next(error); }
});

module.exports = router;
