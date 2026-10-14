require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const { attachUser } = require('./middleware/auth');

const app = express();

// Required when deployed behind Render, Railway, Fly.io, or another reverse proxy.
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(attachUser);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: 'Too many attempts. Please try again in a few minutes.'
});

app.use('/login', authLimiter);
app.use('/signup', authLimiter);
app.use('/forgot-password', authLimiter);
app.use('/reset-password', authLimiter);

app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('home', { title: 'Welcome' });
});

app.use('/', authRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page not found',
    message: 'That page does not exist.'
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Something went wrong',
    message: 'We could not complete that request. Please try again.'
  });
});

async function start() {
  const port = Number(process.env.PORT || 3000);
  validateEnvironment();
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
  } catch (error) {
    throw new Error(formatMongoError(error));
  }
  const server = app.listen(port, () => console.log(`Anchor Auth running at ${process.env.APP_URL || `http://localhost:${port}`}`));
  const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully.`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

function validateEnvironment() {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('MONGODB_URI and JWT_SECRET must be configured in .env. Copy .env.example to .env first.');
  }
  if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes('replace_with')) {
    throw new Error('JWT_SECRET must be a unique random value of at least 32 characters.');
  }
  if (process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1')) {
    console.warn('Using local MongoDB. Make sure the MongoDB server is running, not only MongoDB Compass.');
  }
  if (process.env.MONGODB_URI.includes('<db_username>') || process.env.MONGODB_URI.includes('<db_password>')) {
    throw new Error('Replace the Atlas username and password placeholders in MONGODB_URI.');
  }
}

function formatMongoError(error) {
  const message = String(error?.message || '');
  if (error?.code === 'ENOTFOUND' || error?.reason?.type === 'ReplicaSetNoPrimary') {
    return 'MongoDB host could not be found. Check your Atlas URI and internet connection.';
  }
  if (error?.code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
    return 'MongoDB refused the connection. Start the local MongoDB server or use a MongoDB Atlas URI.';
  }
  if (error?.name === 'MongoServerSelectionError') {
    return 'MongoDB could not be reached. For Atlas, add your current IP in Atlas → Security → Network Access. For local MongoDB, start the MongoDB service.';
  }
  return `MongoDB connection failed: ${error.message}`;
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start application:', error.message);
    process.exit(1);
  });
}

module.exports = { app, start, validateEnvironment, formatMongoError };
