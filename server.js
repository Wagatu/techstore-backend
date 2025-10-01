const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load env vars
dotenv.config();

// Import database connection and models
const { initializeDatabase } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Initialize database
initializeDatabase();

// Routes
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 TechStore API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK',
    service: 'TechStore API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'Connected'
  });
});

// API Routes - ONLY LOAD EXISTING FILES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// COMMENT OUT THESE ROUTES TEMPORARILY - They might not exist yet
// app.use('/api/phone-auth', require('./routes/phoneAuth'));
// app.use('/api/social-auth', require('./routes/socialAuth'));
// app.use('/api/location', require('./routes/location'));
// app.use('/api/guest', require('./routes/guestCheckout'));

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🎯 TechStore Backend Server Started!
🔗 http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📊 Database: PostgreSQL
🕐 Started at: ${new Date().toLocaleString()}
  `);
});