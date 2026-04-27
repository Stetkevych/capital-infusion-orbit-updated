const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config/runtime');
const { initializeDb } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const { authMiddleware } = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const dealRoutes = require('./routes/deals');
const clientsApiRoutes = require('./routes/clients');
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

console.log(`Starting Capital Infusion API`);
console.log(`Environment: ${NODE_ENV} | Port: ${PORT}`);

require('./services/userStore').init().catch(err => console.warn('UserStore init:', err.message));

initializeDb().catch(err => {
  console.warn('DB init warning:', err.message);
});

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: [
    'https://main.d2iq2t6ose4q0u.amplifyapp.com',
    'https://main.dpfmybb1s06ep.amplifyapp.com',
    'https://www.orbit-technology.com',
    'https://orbit-technology.com',
    FRONTEND_URL,
    'http://localhost:3000',
  ].filter(Boolean),
  credentials: true
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/clients-api', clientsApiRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/plaid', plaidRoutes);
app.use('/api/docusign', docusignRoutes);
app.use('/api/zoho', zohoRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/metrics', metricsRoutes);

// One-time backfill route
const backfillRoutes = require('./routes/backfill');
app.use('/api/backfill', backfillRoutes);

// Commission calculator
const commissionRoutes = require('./routes/commissions');
app.use('/api/commissions', commissionRoutes);

// Activity log
const activityRoutes = require('./routes/activity');
app.use('/api/activity', activityRoutes);

// Actum ACH / LOC payments
const actumRoutes = require('./routes/actum');
app.use('/api/actum', actumRoutes);
app.use('/api/loc', actumRoutes);

// Client data metrics
const clientDataRoutes = require('./routes/clientData');
app.use('/api/client-data', clientDataRoutes);

// Messages
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// Underwriting corrections
const correctionsRoutes = require('./routes/corrections');
app.use('/api/corrections', correctionsRoutes);

// LOC v2 with Onyx integration
const locV2Routes = require('./routes/locV2');
app.use('/api/loc-v2', locV2Routes);

// Nexus chat (public, no auth)
const nexusChatRoutes = require('./routes/nexusChat');
app.use('/api/nexus', nexusChatRoutes);

// Nexus training library (auth required)
const nexusRoutes = require('./routes/nexus');
app.use('/api/nexus', nexusRoutes);

// Apollo lead finder proxy
const apolloRoutes = require('./routes/apollo');
app.use('/api/apollo', apolloRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start DocuSign envelope polling
  try {
    const { startPolling } = require('./services/docusignPoller');
    startPolling();
  } catch (e) { console.warn('[DocuSign Poll] Could not start:', e.message); }
});

module.exports = app;
