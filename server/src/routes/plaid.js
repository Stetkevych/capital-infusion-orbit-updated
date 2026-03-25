const express = require('express');
const axios = require('axios');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const plaidClient = axios.create({
  baseURL: process.env.PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : 'https://sandbox.plaid.com',
  timeout: 10000
});

// Create link token
router.post('/create-link-token', auth, asyncHandler(async (req, res) => {
  const { merchant_id, user_name, user_email } = req.body;

  if (!merchant_id || !user_name || !user_email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const response = await plaidClient.post('/link/token/create', {
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      user: {
        client_user_id: merchant_id,
        legal_name: user_name,
        email_address: user_email
      },
      client_name: 'MCA Lending Platform',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en'
    });

    res.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration
    });
  } catch (err) {
    console.error('Create link token error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to create Plaid link token' });
  }
}));

// Exchange public token for access token
router.post('/exchange-token', auth, asyncHandler(async (req, res) => {
  const { public_token, merchant_id } = req.body;

  if (!public_token || !merchant_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const response = await plaidClient.post('/item/public_token/exchange', {
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      public_token: public_token
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account info
    const accountsResponse = await plaidClient.post('/auth/get', {
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      access_token: accessToken
    });

    const accounts = accountsResponse.data.accounts;

    // Store in database
    await query(
      `UPDATE merchants SET 
       plaid_access_token = $1, 
       plaid_item_id = $2,
       plaid_accounts = $3,
       bank_connected = true,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [accessToken, itemId, JSON.stringify(accounts), merchant_id]
    );

    // Create bank connection record
    const mainAccount = accounts[0];
    await query(
      `INSERT INTO bank_connections (
        merchant_id, plaid_item_id, bank_name, account_name,
        account_mask, account_subtype, connection_status, connected_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (merchant_id) DO UPDATE SET
        plaid_item_id = $2,
        connection_status = $7,
        connected_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`,
      [
        merchant_id,
        itemId,
        'Bank',
        mainAccount.name,
        mainAccount.mask,
        mainAccount.subtype,
        'connected'
      ]
    );

    res.json({
      message: 'Bank connected successfully',
      accounts: accounts.map(a => ({
        id: a.account_id,
        name: a.name,
        type: a.type,
        mask: a.mask
      }))
    });
  } catch (err) {
    console.error('Exchange token error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to connect bank account' });
  }
}));

// Get transactions
router.get('/transactions/:merchant_id', auth, asyncHandler(async (req, res) => {
  const { merchant_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    const merchantResult = await query(
      'SELECT plaid_access_token FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (merchantResult.rows.length === 0 || !merchantResult.rows[0].plaid_access_token) {
      return res.status(404).json({ message: 'Plaid account not connected' });
    }

    const response = await plaidClient.post('/transactions/get', {
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      access_token: merchantResult.rows[0].plaid_access_token,
      start_date: start_date || new Date(Date.now() - 90*24*60*60*1000).toISOString().split('T')[0],
      end_date: end_date || new Date().toISOString().split('T')[0]
    });

    res.json(response.data.transactions);
  } catch (err) {
    console.error('Get transactions error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to fetch transactions' });
  }
}));

// Get bank connection status
router.get('/status/:merchant_id', auth, asyncHandler(async (req, res) => {
  const { merchant_id } = req.params;

  try {
    const result = await query(
      'SELECT bank_connected, plaid_item_id FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ message: 'Failed to fetch connection status' });
  }
}));

module.exports = router;
