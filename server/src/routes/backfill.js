const express = require('express');
const router = express.Router();
const axios = require('axios');
const ClientStore = require('../services/clientStore');

router.post('/backfill-tabs', async (req, res) => {
  try {
    const docusignService = require('../services/docusignService');
    const token = await docusignService.getAccessToken();
    const baseUri = await docusignService.getBaseUri();
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    const allClients = await ClientStore.getAll();
    const docusignClients = allClients.filter(c => c.source === 'docusign' && c.envelopeId);

    console.log(`[Backfill] Processing ${docusignClients.length} DocuSign clients`);

    const results = [];

    for (const client of docusignClients) {
      try {
        const detailUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${client.envelopeId}/recipients?include_tabs=true`;
        const detailRes = await axios.get(detailUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const signers = detailRes.data?.signers || [];
        const primarySigner = signers[0];
        if (!primarySigner) { results.push({ id: client.id, status: 'no_signer' }); continue; }

        const tabs = primarySigner.tabs || {};
        const allTabs = [
          ...(tabs.textTabs || []),
          ...(tabs.numberTabs || []),
          ...(tabs.emailTabs || []),
          ...(tabs.dateTabs || []),
        ];
        const tabMap = {};
        allTabs.forEach(t => {
          const label = (t.tabLabel || '').toLowerCase().trim();
          const value = (t.value || '').trim();
          if (label && value) tabMap[label] = value;
        });

        const parsedPhone = tabMap['phone'] || tabMap['phonenumber'] || tabMap['phone number'] || tabMap['cell'] || tabMap['mobile'] || '';
        const parsedBusinessName = tabMap['businessname'] || tabMap['business name'] || tabMap['business'] || tabMap['company'] || tabMap['companyname'] || '';
        const parsedIndustry = tabMap['industry'] || tabMap['business type'] || '';
        const parsedState = tabMap['state'] || tabMap['st'] || '';
        const parsedAddress = tabMap['address'] || tabMap['businessaddress'] || tabMap['business address'] || '';

        const updates = { tabData: tabMap };
        if (parsedPhone && !client.phone) updates.phone = parsedPhone;
        if (parsedState && !client.state) updates.state = parsedState;
        if (parsedAddress && !client.address) updates.address = parsedAddress;
        if (parsedIndustry && !client.industry) updates.industry = parsedIndustry;
        if (parsedBusinessName && (!client.businessName || client.businessName === client.ownerName)) {
          updates.businessName = parsedBusinessName;
        }

        await ClientStore.update(client.id, updates);
        console.log(`[Backfill] Updated ${client.email}: ${Object.keys(updates).filter(k => k !== 'tabData').join(', ') || 'tabData only'}`);
        results.push({ id: client.id, email: client.email, status: 'updated', fields: Object.keys(updates) });

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`[Backfill] Failed for ${client.email}: ${e.message}`);
        results.push({ id: client.id, email: client.email, status: 'error', error: e.message });
      }
    }

    res.json({ processed: results.length, results });
  } catch (err) {
    console.error('[Backfill] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
