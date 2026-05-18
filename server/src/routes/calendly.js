const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const CALENDLY_TOKEN = process.env.CALENDLY_API_KEY || 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc5MTEzMDU2LCJqdGkiOiIxOGQyMmY3Zi00NTU3LTQyNGEtYmQ1NC0xOTgzMTk1MTkwNTEiLCJ1c2VyX3V1aWQiOiIwNjgyOGRlMC03NWU2LTQ2ZGMtOGE5OC05YTcwNGRjYjhkZDYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.hf4QpV1uBLg8NyFwNPUGz3-5qy3uIKktX9LgeExfw7ZZZHHTx2u9xLZWyUy-Er7p1a7mL7PKbDF-EoI-K99oNQ';
const CALENDLY_ORG = 'https://api.calendly.com/organizations/ed8ab3ad-c27d-4fea-89a7-9c2fbcf5e1d0';

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '1000.K9WQ90VY6CTPNEUFUI1XK7OVRI73LE';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || 'c4d4c5e9b4a71bd7db2df19c8b2a290dada7a45316';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '1000.ff5ae025d090880ae609fe697a3eb255.bf624e77cefcbc4af1759838b80fc5c0';
const ZOHO_API = 'https://www.zohoapis.com';

let zohoToken = '', zohoExpiry = 0;

async function getZohoToken() {
  if (zohoToken && Date.now() < zohoExpiry) return zohoToken;
  const params = new URLSearchParams({ grant_type: 'refresh_token', client_id: ZOHO_CLIENT_ID, client_secret: ZOHO_CLIENT_SECRET, refresh_token: ZOHO_REFRESH_TOKEN });
  const res = await axios.post(`https://accounts.zoho.com/oauth/v2/token?${params}`);
  if (res.data.error) throw new Error(`Zoho auth: ${res.data.error}`);
  zohoToken = res.data.access_token;
  zohoExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return zohoToken;
}

async function zohoGet(path) {
  const token = await getZohoToken();
  try { const res = await axios.get(`${ZOHO_API}${path}`, { headers: { Authorization: `Zoho-oauthtoken ${token}` } }); return res.data; }
  catch (e) { return { data: [] }; }
}

// Normalize name: collapse spaces, title case
function norm(name) { return (name || '').replace(/\s+/g, ' ').trim(); }
function normKey(name) { return norm(name).toLowerCase(); }

const SKIP_KEYS = new Set(['house .', 'convoso dialer', 'ruth vergel', 'assigning leads', 'capital infusion', 'text', 'marketing', 'the fund zone', 'get funding solutions', 'phil', 'manager .'].map(s => s.toLowerCase()));

// GET /api/calendly/metrics — Waymo-scoped funnel per rep
router.get('/metrics', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const minDate = new Date(Date.now() - days * 86400000).toISOString();
    const maxDate = new Date().toISOString();

    // ─── Calendly org-wide ───────────────────────────────────────────────
    const calHdrs = { Authorization: `Bearer ${CALENDLY_TOKEN}` };
    let calEvents = [], calCanceled = [];
    let next = `https://api.calendly.com/scheduled_events?organization=${CALENDLY_ORG}&count=100&min_start_time=${minDate}&max_start_time=${maxDate}&status=active`;
    while (next) { try { const r = await axios.get(next, { headers: calHdrs }); calEvents = calEvents.concat(r.data.collection || []); next = r.data.pagination?.next_page || null; } catch { break; } }
    next = `https://api.calendly.com/scheduled_events?organization=${CALENDLY_ORG}&count=100&status=canceled&min_start_time=${minDate}&max_start_time=${maxDate}`;
    while (next) { try { const r = await axios.get(next, { headers: calHdrs }); calCanceled = calCanceled.concat(r.data.collection || []); next = r.data.pagination?.next_page || null; } catch { break; } }

    // ─── Zoho: Waymo leads ───────────────────────────────────────────────
    let waymoLeads = [];
    let page = 1, more = true;
    while (more && page <= 10) { const d = await zohoGet(`/crm/v2/Leads/search?criteria=(Lead_Source:equals:Waymo)&per_page=200&page=${page}`); waymoLeads = waymoLeads.concat(d.data || []); more = d.info?.more_records || false; page++; }

    // ─── Zoho: Waymo deals ───────────────────────────────────────────────
    let waymoDeals = [];
    page = 1; more = true;
    while (more && page <= 5) { const d = await zohoGet(`/crm/v2/Deals/search?criteria=(Lead_Source2:equals:Waymo)&per_page=200&page=${page}`); waymoDeals = waymoDeals.concat(d.data || []); more = d.info?.more_records || false; page++; }

    // ─── Per-rep computation (keyed by normalized name) ──────────────────
    const repMap = {}; // normKey -> { displayName, ... }
    const ensure = (rawName) => {
      const key = normKey(rawName);
      if (!key || SKIP_KEYS.has(key)) return null;
      if (!repMap[key]) repMap[key] = { display: norm(rawName), cal_active: 0, cal_canceled: 0, leads: 0, showed: 0, no_show: 0, interested: 0, dnq: 0, not_interested: 0, deals: 0, funded_amt: 0, pts: 0 };
      return key;
    };

    // Calendly
    calEvents.forEach(e => (e.event_memberships || []).forEach(m => { const k = ensure(m.user_name); if (k) repMap[k].cal_active++; }));
    calCanceled.forEach(e => (e.event_memberships || []).forEach(m => { const k = ensure(m.user_name); if (k) repMap[k].cal_canceled++; }));

    // Waymo leads
    let totalNoShows = 0;
    waymoLeads.forEach(l => {
      const owner = l.Owner?.name || '';
      const disp = l.Disposition || '';
      if (disp === 'No Show') totalNoShows++;
      const key = normKey(owner);
      if (!key || SKIP_KEYS.has(key)) return;
      const k = ensure(owner);
      if (!k) return;
      repMap[k].leads++;
      if (disp === 'No Show') repMap[k].no_show++;
      else repMap[k].showed++;
      if (disp === 'Interested' || disp === 'SBA - Interested') repMap[k].interested++;
      if (disp === 'DNQ') repMap[k].dnq++;
      if (disp === 'Not Interested') repMap[k].not_interested++;
    });

    // Waymo deals
    waymoDeals.forEach(d => {
      const owner = d.Package_Owner?.name || d.Owner?.name || '';
      const k = ensure(owner);
      if (!k) return;
      repMap[k].deals++;
      repMap[k].funded_amt += (d.Funded_Amount || 0);
      repMap[k].pts += (parseFloat(d.pts) || 0);
    });

    // Build breakdown
    const rep_breakdown = {};
    Object.entries(repMap).forEach(([key, s]) => {
      const calTotal = s.cal_active + s.cal_canceled;
      if (calTotal === 0 && s.leads === 0 && s.deals === 0) return;
      // Show-up rate: leads that showed / total leads for this rep
      const showUp = s.leads > 0 ? Math.round((s.showed / s.leads) * 100) : null;
      // Lead to app: deals / showed (out of those who showed up)
      const leadToApp = s.showed > 0 ? Math.round((s.deals / s.showed) * 100) : null;
      // Funding rate: same as lead to app for Waymo (all Waymo deals are funded)
      const fundingRate = s.showed > 0 ? Math.round((s.deals / s.showed) * 100) : null;
      const avgDeal = s.deals > 0 ? Math.round(s.funded_amt / s.deals) : null;
      const avgPts = s.deals > 0 ? Math.round((s.pts / s.deals) * 10) / 10 : null;

      rep_breakdown[s.display] = {
        calendly_scheduled: calTotal, calendly_active: s.cal_active, calendly_canceled: s.cal_canceled,
        waymo_leads: s.leads, waymo_showed: s.showed, waymo_no_show: s.no_show,
        show_up_rate: showUp,
        lead_to_app_rate: leadToApp,
        funding_rate: fundingRate,
        deals_funded: s.deals, avg_deal_size: avgDeal, total_funded_amount: s.funded_amt,
        avg_pts: avgPts, total_pts: s.pts,
      };
    });

    const totalWaymo = waymoLeads.length;
    const totalShowed = totalWaymo - totalNoShows;
    const totalFunded = waymoDeals.reduce((s, d) => s + (d.Funded_Amount || 0), 0);

    res.json({
      period: { days: parseInt(days), from: minDate, to: maxDate },
      totals: {
        calendly_scheduled: calEvents.length + calCanceled.length,
        calendly_active: calEvents.length,
        calendly_canceled: calCanceled.length,
        waymo_leads_total: totalWaymo,
        waymo_showed: totalShowed,
        waymo_no_shows: totalNoShows,
        show_up_rate: totalWaymo > 0 ? Math.round((totalShowed / totalWaymo) * 100) : 0,
        lead_to_app_rate: totalShowed > 0 ? Math.round((waymoDeals.length / totalShowed) * 100) : 0,
        funding_rate: totalShowed > 0 ? Math.round((waymoDeals.length / totalShowed) * 100) : 0,
        waymo_deals: waymoDeals.length,
        total_funded_amount: totalFunded,
        avg_deal_size: waymoDeals.length > 0 ? Math.round(totalFunded / waymoDeals.length) : 0,
        avg_pts: waymoDeals.length > 0 ? Math.round((waymoDeals.reduce((s, d) => s + (parseFloat(d.pts) || 0), 0) / waymoDeals.length) * 10) / 10 : 0,
      },
      rep_breakdown,
      events: calEvents.slice(0, 50),
    });
  } catch (e) {
    console.error('[Waymo Metrics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/full-data — ALL Zoho deals for Full Client Data page
router.get('/full-data', async (req, res) => {
  try {
    let deals = [];
    let page = 1, more = true;
    while (more && page <= 20) { const d = await zohoGet(`/crm/v2/Deals?per_page=200&page=${page}`); deals = deals.concat(d.data || []); more = d.info?.more_records || false; page++; }

    const repStats = {};
    const ensure = (name) => { const key = normKey(name); if (!key || SKIP_KEYS.has(key)) return null; if (!repStats[key]) repStats[key] = { display: norm(name), deals: 0, funded_amt: 0, pts: 0, sources: {}, stages: {} }; return key; };

    deals.forEach(d => {
      const owner = d.Package_Owner?.name || d.Owner?.name || '';
      const k = ensure(owner);
      if (!k) return;
      repStats[k].deals++;
      repStats[k].funded_amt += (d.Funded_Amount || 0);
      repStats[k].pts += (parseFloat(d.pts) || 0);
      const src = d.Lead_Source2 || d.Lead_Master || 'Unknown';
      repStats[k].sources[src] = (repStats[k].sources[src] || 0) + 1;
      const stage = d.Stage || 'Unknown';
      repStats[k].stages[stage] = (repStats[k].stages[stage] || 0) + 1;
    });

    const rep_data = {};
    Object.values(repStats).forEach(s => {
      if (s.deals === 0) return;
      rep_data[s.display] = {
        deals_total: s.deals, total_funded_amount: s.funded_amt,
        avg_deal_size: Math.round(s.funded_amt / s.deals),
        total_pts: s.pts, avg_pts: Math.round((s.pts / s.deals) * 10) / 10,
        sources: s.sources, stages: s.stages,
        deals_won: s.stages['Closed Won'] || 0,
        deals_in_pipeline: s.stages['Qualification'] || 0,
        funding_rate: s.deals > 0 ? Math.round(((s.stages['Closed Won'] || 0) / s.deals) * 100) : 0,
      };
    });

    const totalDeals = deals.length;
    const totalFunded = deals.reduce((s, d) => s + (d.Funded_Amount || 0), 0);
    const totalWon = deals.filter(d => d.Stage === 'Closed Won').length;

    res.json({
      totals: { deals: totalDeals, funded_amount: totalFunded, avg_deal_size: totalDeals > 0 ? Math.round(totalFunded / totalDeals) : 0, total_pts: deals.reduce((s, d) => s + (parseFloat(d.pts) || 0), 0), deals_won: totalWon, funding_rate: totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : 0 },
      rep_data,
    });
  } catch (e) {
    console.error('[Full Data]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
