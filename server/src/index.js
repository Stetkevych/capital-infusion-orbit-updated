const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load runtime configuration (reads .runtimeconfig.json and .env)
const config = require('./config/runtime');

const { initializeDb } = require('./config/database');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const dealRoutes = require('./routes/deals');
const documentRoutes = require('./routes/documents');
const plaidRoutes = require('./routes/plaid');
const docusignRoutes = require('./routes/docusign');
const zohoRoutes = require('./routes/zoho');
const offersRoutes = require('./routes/offers');
const analyticsRoutes = require('./routes/analytics');
const metricsRoutes = require('./routes/metrics');

const app = express();
const PORT = config.get('PORT');
const FRONTEND_URL = config.get('FRONTEND_URL');
const NODE_ENV = config.get('NODE_ENV');

console.log(`🚀 Starting MCA Lending Platform`);
console.log(`Environment: ${NODE_ENV}`);
console.log(`Port: ${PORT}`);
console.log(`Frontend URL: ${FRONTEND_URL}`);

// Initialize user store
require('./services/userStore').init();

// Initialize database
initializeDb().catch(err => {
  console.warn('DB init warning:', err.message);
});

// Trust proxy for EB/nginx
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/docusign', docusignRoutes);
app.use('/api/zoho', zohoRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/metrics', metricsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

module.exports = app;
