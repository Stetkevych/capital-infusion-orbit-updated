require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testDocuSignConnection() {
  console.log('Testing DocuSign JWT connection...\n');

  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!integrationKey || !userId || !accountId || !privateKey) {
    console.error('Missing credentials in .env file');
    console.log('Have DOCUSIGN_INTEGRATION_KEY:', !!integrationKey);
    console.log('Have DOCUSIGN_USER_ID:', !!userId);
    console.log('Have DOCUSIGN_ACCOUNT_ID:', !!accountId);
    console.log('Have DOCUSIGN_PRIVATE_KEY:', !!privateKey);
    process.exit(1);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    };

    const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    console.log('JWT assertion created successfully');

    const response = await axios.post(
      'https://account-d.docusign.com/oauth/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    console.log('✅ DocuSign connection successful!');
    console.log('Access token received:', response.data.access_token.substring(0, 20) + '...');

    // Test getting account info
    const accountResponse = await axios.get(
      `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}`,
      { headers: { Authorization: `Bearer ${response.data.access_token}` } }
    );

    console.log('✅ Account verified:', accountResponse.data.accountName);
    console.log('\nDocuSign integration is ready to go!');

  } catch (err) {
    console.error('❌ Connection failed:', err.response?.data || err.message);
  }
}

testDocuSignConnection();
