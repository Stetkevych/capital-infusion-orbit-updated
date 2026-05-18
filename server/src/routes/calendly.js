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

let zohoToken = '';
let zohoExpiry = 0;

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
  try {
    const res = await axios.get(`${ZOHO_API}${path}`, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
    return res.data;
  } catch (e) {
    if (e.response?.status === 204) return { data: [] };
    return { data: [] };
  }
}

const SKIP_OWNERS = ['House .', 'Convoso Dialer', 'Ruth Vergel', 'Assigning Leads', 'Capital Infusion', 'Text', 'Marketing', 'The Fund Zone', 'Get Funding Solutions', 'PHIL', 'Manager .'];

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

    // ─── Zoho: Waymo deals (Lead_Source2 = Waymo) ────────────────────────
    let waymoDeals = [];
    page = 1; more = true;
    while (more && page <= 5) { const d = await zohoGet(`/crm/v2/Deals/search?criteria=(Lead_Source2:equals:Waymo)&per_page=200&page=${page}`); waymoDeals = waymoDeals.concat(d.data || []); more = d.info?.more_records || false; page++; }

    // ─── Per-rep computation ─────────────────────────────────────────────
    const repStats = {};
    const ensure = (name) => { if (!name || SKIP_OWNERS.includes(name)) return null; if (!repStats[name]) repStats[name] = { cal_active: 0, cal_canceled: 0, leads: 0, showed: 0, no_show: 0, interested: 0, dnq: 0, not_interested: 0, deals: 0, funded_amt: 0, pts: 0 }; return name; };

    // Calendly
    calEvents.forEach(e => (e.event_memberships || []).forEach(m => { const n = ensure(m.user_name); if (n) repStats[n].cal_active++; }));
    calCanceled.forEach(e => (e.event_memberships || []).forEach(m => { const n = ensure(m.user_name); if (n) repStats[n].cal_canceled++; }));

    // Waymo leads — disposition-based no-show tracking
    let totalNoShows = 0;
    waymoLeads.forEach(l => {
      const owner = l.Owner?.name || '';
      const disp = l.Disposition || '';
      // Count no-shows globally (including those in House)
      if (disp === 'No Show') totalNoShows++;
      // Skip system owners
      if (SKIP_OWNERS.includes(owner)) return;
      const n = ensure(owner);
      if (!n) return;
      repStats[n].leads++;
      if (disp === 'No Show') repStats[n].no_show++;
      else repStats[n].showed++;
      if (disp === 'Interested' || disp === 'SBA - Interested') repStats[n].interested++;
      if (disp === 'DNQ') repStats[n].dnq++;
      if (disp === 'Not Interested') repStats[n].not_interested++;
    });

    // Waymo deals
    waymoDeals.forEach(d => {
      const owner = d.Package_Owner?.name || d.Owner?.name || '';
      const n = ensure(owner);
      if (!n) return;
      repStats[n].deals++;
      repStats[n].funded_amt += (d.Funded_Amount || 0);
      repStats[n].pts += (parseFloat(d.pts) || 0);
    });

    // Build breakdown
    const rep_breakdown = {};
    Object.entries(repStats).forEach(([name, s]) => {
      const calTotal = s.cal_active + s.cal_canceled;
      if (calTotal === 0 && s.leads === 0 && s.deals === 0) return;
      const showUp = s.leads > 0 ? Math.round(((s.leads - s.no_show) / s.leads) * 100) : null;
      const leadToApp = s.showed > 0 ? Math.round((s.deals / s.showed) * 100) : null;
      const avgDeal = s.deals > 0 ? Math.round(s.funded_amt / s.deals) : null;
      const avgPts = s.deals > 0 ? Math.round((s.pts / s.deals) * 10) / 10 : null;
      rep_breakdown[name] = {
        calendly_scheduled: calTotal, calendly_active: s.cal_active, calendly_canceled: s.cal_canceled,
        waymo_leads: s.leads, waymo_showed: s.showed, waymo_no_show: s.no_show,
        waymo_interested: s.interested, waymo_dnq: s.dnq, waymo_not_interested: s.not_interested,
        show_up_rate: showUp, lead_to_app_rate: leadToApp,
        deals_funded: s.deals, avg_deal_size: avgDeal, total_funded_amount: s.funded_amt,
        avg_pts: avgPts, total_pts: s.pts,
      };
    });

    const totalWaymo = waymoLeads.length;
    const totalFunded = waymoDeals.reduce((s, d) => s + (d.Funded_Amount || 0), 0);

    res.json({
      period: { days: parseInt(days), from: minDate, to: maxDate },
      totals: {
        calendly_scheduled: calEvents.length + calCanceled.length, calendly_active: calEvents.length, calendly_canceled: calCanceled.length,
        waymo_leads_total: totalWaymo, waymo_no_shows: totalNoShows,
        show_up_rate: totalWaymo > 0 ? Math.round(((totalWaymo - totalNoShows) / totalWaymo) * 100) : 0,
        waymo_deals: waymoDeals.length, total_funded_amount: totalFunded,
        avg_deal_size: waymoDeals.length > 0 ? Math.round(totalFunded / waymoDeals.length) : 0,
        total_pts: waymoDeals.reduce((s, d) => s + (parseFloat(d.pts) || 0), 0),
      },
      rep_breakdown,
      events: calEvents.slice(0, 50),
    });
  } catch (e) {
    console.error('[Waymo Metrics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/full-data — ALL Zoho deals (all sources) for Full Client Data page
router.get('/full-data', async (req, res) => {
  try {
    // All deals (up to 4000)
    let deals = [];
    let page = 1, more = true;
    while (more && page <= 20) { const d = await zohoGet(`/crm/v2/Deals?per_page=200&page=${page}`); deals = deals.concat(d.data || []); more = d.info?.more_records || false; page++; }

    // Per-rep stats across ALL sources
    const repStats = {};
    const ensure = (name) => { if (!name || SKIP_OWNERS.includes(name)) return null; if (!repStats[name]) repStats[name] = { deals: 0, funded_amt: 0, pts: 0, sources: {}, stages: {} }; return name; };

    deals.forEach(d => {
      const owner = d.Package_Owner?.name || d.Owner?.name || '';
      const n = ensure(owner);
      if (!n) return;
      repStats[n].deals++;
      repStats[n].funded_amt += (d.Funded_Amount || 0);
      repStats[n].pts += (parseFloat(d.pts) || 0);
      const src = d.Lead_Source2 || d.Lead_Master || 'Unknown';
      repStats[n].sources[src] = (repStats[n].sources[src] || 0) + 1;
      const stage = d.Stage || 'Unknown';
      repStats[n].stages[stage] = (repStats[n].stages[stage] || 0) + 1;
    });

    const rep_data = {};
    Object.entries(repStats).forEach(([name, s]) => {
      if (s.deals === 0) return;
      rep_data[name] = {
        deals_total: s.deals,
        total_funded_amount: s.funded_amt,
        avg_deal_size: Math.round(s.funded_amt / s.deals),
        total_pts: s.pts,
        avg_pts: Math.round((s.pts / s.deals) * 10) / 10,
        sources: s.sources,
        stages: s.stages,
        deals_won: s.stages['Closed Won'] || 0,
        deals_in_pipeline: s.stages['Qualification'] || 0,
        funding_rate: s.deals > 0 ? Math.round(((s.stages['Closed Won'] || 0) / s.deals) * 100) : 0,
      };
    });

    // Org-wide totals
    const totalDeals = deals.length;
    const totalFunded = deals.reduce((s, d) => s + (d.Funded_Amount || 0), 0);
    const totalPts = deals.reduce((s, d) => s + (parseFloat(d.pts) || 0), 0);
    const totalWon = deals.filter(d => d.Stage === 'Closed Won').length;

    res.json({
      totals: { deals: totalDeals, funded_amount: totalFunded, avg_deal_size: totalDeals > 0 ? Math.round(totalFunded / totalDeals) : 0, total_pts: totalPts, deals_won: totalWon, funding_rate: totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : 0 },
      rep_data,
    });
  } catch (e) {
    console.error('[Full Data]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
