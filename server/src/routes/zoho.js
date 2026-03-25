const express = require('express');
const axios = require('axios');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const zohoClient = axios.create({
  baseURL: `https://www.zohoapis.${process.env.ZOHO_ACCOUNT_DOMAIN}/crm/v2`,
  timeout: 10000
});

// Helper to get access token (refresh if needed)
const getZohoToken = async () => {
  try {
    const response = await axios.post(
      `https://accounts.zoho.${process.env.ZOHO_ACCOUNT_DOMAIN}/oauth/v2/token`,
      {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token'
      },
      { timeout: 5000 }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('Zoho token error:', err);
    throw err;
  }
};

// Sync merchants as Leads
router.post('/sync-leads', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const token = await getZohoToken();

    // Get merchants that haven't been synced
    const merchantsResult = await query(
      `SELECT id, legal_name, owner_email, owner_phone, business_address, industry
       FROM merchants 
       WHERE id NOT IN (SELECT resource_id FROM zoho_sync_logs WHERE resource_type = 'merchant')
       LIMIT 100`,
      []
    );

    const merchants = merchantsResult.rows;
    const syncedIds = [];

    for (const merchant of merchants) {
      try {
        const leadData = {
          data: [{
            Last_Name: merchant.legal_name,
            Email: merchant.owner_email,
            Phone: merchant.owner_phone,
            Company: merchant.legal_name,
            Industry: merchant.industry,
            Postal_Code: merchant.business_address
          }]
        };

        const response = await zohoClient.post('/Leads', leadData, {
          headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0]) {
          const zohoId = response.data.data[0].id;

          // Log sync
          await query(
            `INSERT INTO zoho_sync_logs (sync_type, resource_type, resource_id, zoho_id, status, last_sync, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            ['sync-in', 'merchant', merchant.id, zohoId, 'success']
          );

          syncedIds.push(merchant.id);
        }
      } catch (err) {
        console.error(`Failed to sync merchant ${merchant.id}:`, err.response?.data || err.message);
      }
    }

    res.json({
      message: 'Merchants synced to Zoho',
      synced_count: syncedIds.length,
      total_count: merchants.length
    });
  } catch (err) {
    console.error('Sync leads error:', err);
    res.status(500).json({ message: 'Failed to sync leads' });
  }
}));

// Sync deals
router.post('/sync-deals', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const token = await getZohoToken();

    // Get deals that haven't been synced
    const dealsResult = await query(
      `SELECT id, merchant_name, funding_amount, factor_rate, status
       FROM deals 
       WHERE id NOT IN (SELECT resource_id FROM zoho_sync_logs WHERE resource_type = 'deal')
       LIMIT 50`,
      []
    );

    const deals = dealsResult.rows;
    const syncedIds = [];

    for (const deal of deals) {
      try {
        const dealData = {
          data: [{
            Deal_Name: deal.merchant_name,
            Amount: deal.funding_amount,
            Stage: deal.status === 'active' ? 'Negotiation/Review' : 'Closed Won'
          }]
        };

        const response = await zohoClient.post('/Deals', dealData, {
          headers: { 'Authorization': `Zoho-oauthtoken ${token}` }
        });

        if (response.data.data && response.data.data[0]) {
          const zohoId = response.data.data[0].id;

          await query(
            `INSERT INTO zoho_sync_logs (sync_type, resource_type, resource_id, zoho_id, status, last_sync, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            ['sync-in', 'deal', deal.id, zohoId, 'success']
          );

          syncedIds.push(deal.id);
        }
      } catch (err) {
        console.error(`Failed to sync deal ${deal.id}:`, err.response?.data || err.message);
      }
    }

    res.json({
      message: 'Deals synced to Zoho',
      synced_count: syncedIds.length,
      total_count: deals.length
    });
  } catch (err) {
    console.error('Sync deals error:', err);
    res.status(500).json({ message: 'Failed to sync deals' });
  }
}));

// Get sync status
router.get('/sync-status', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_syncs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        MAX(last_sync) as last_sync_time
       FROM zoho_sync_logs`,
      []
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get sync status error:', err);
    res.status(500).json({ message: 'Failed to fetch sync status' });
  }
}));

// Sync logs
router.get('/sync-logs', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM zoho_sync_logs ORDER BY last_sync DESC LIMIT 100`,
      []
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get sync logs error:', err);
    res.status(500).json({ message: 'Failed to fetch sync logs' });
  }
}));

module.exports = router;
