const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function attachUser(req, res, next) {
  res.locals.currentUser = null;
  const token = req.cookies.auth_token;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('_id email').lean();
    if (user) {
      req.user = user;
      res.locals.currentUser = user;
    }
  } catch (error) {
    res.clearCookie('auth_token', cookieOptions());
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login?message=Please%20log%20in%20to%20continue');
  next();
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000,
    path: '/'
  };
}

module.exports = { attachUser, requireAuth, cookieOptions };
