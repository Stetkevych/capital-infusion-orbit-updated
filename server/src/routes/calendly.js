const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const CALENDLY_TOKEN = process.env.CALENDLY_API_KEY || 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc5MTEzMDU2LCJqdGkiOiIxOGQyMmY3Zi00NTU3LTQyNGEtYmQ1NC0xOTgzMTk1MTkwNTEiLCJ1c2VyX3V1aWQiOiIwNjgyOGRlMC03NWU2LTQ2ZGMtOGE5OC05YTcwNGRjYjhkZDYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.hf4QpV1uBLg8NyFwNPUGz3-5qy3uIKktX9LgeExfw7ZZZHHTx2u9xLZWyUy-Er7p1a7mL7PKbDF-EoI-K99oNQ';
const CALENDLY_ORG = 'https://api.calendly.com/organizations/ed8ab3ad-c27d-4fea-89a7-9c2fbcf5e1d0';

// Zoho CRM credentials
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
  const data = res.data;
  if (data.error) throw new Error(`Zoho auth: ${data.error}`);
  zohoToken = data.access_token;
  zohoExpiry = Date.now() + (data.expires_in - 60) * 1000;
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

// Known reps (not House, not system accounts)
const REP_NAMES = ['Kip Langat', 'Ken Pflug', 'Kevin McManus', 'Ray Ortega', 'Colin O\'Bryan', 'Erik Anderson', 'Ivan Ortega', 'Evan Kruer', 'Anthony Diaz', 'Michael Cifuentes', 'Emilio Arguello', 'Blake Fiorito', 'Rio Pampallona', 'Cristian Piña', 'Christian Quintana', 'Joseph Hernandez', 'Matthew Schweri', 'Jonathan Montpeirous', 'Guillermo Loaiza', 'Andy Rondon', 'Santiago Diaz', 'Nicholas Orchano', 'Careem Roberts', 'Jonathan Ortega', 'Marco Loa', 'Jason McGory'];

// GET /api/calendly/metrics - Combined Calendly + Zoho metrics by rep
router.get('/metrics', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const minDate = new Date(Date.now() - days * 86400000).toISOString();
    const maxDate = new Date().toISOString();

    // ─── Calendly: org-wide events ───────────────────────────────────────
    const calHdrs = { Authorization: `Bearer ${CALENDLY_TOKEN}`, 'Content-Type': 'application/json' };
    let calEvents = [];
    let calCanceled = [];

    let nextPage = `https://api.calendly.com/scheduled_events?organization=${CALENDLY_ORG}&count=100&min_start_time=${minDate}&max_start_time=${maxDate}&status=active`;
    while (nextPage) {
      try {
        const r = await axios.get(nextPage, { headers: calHdrs });
        calEvents = calEvents.concat(r.data.collection || []);
        nextPage = r.data.pagination?.next_page || null;
      } catch { break; }
    }

    let cancelPage = `https://api.calendly.com/scheduled_events?organization=${CALENDLY_ORG}&count=100&status=canceled&min_start_time=${minDate}&max_start_time=${maxDate}`;
    while (cancelPage) {
      try {
        const r = await axios.get(cancelPage, { headers: calHdrs });
        calCanceled = calCanceled.concat(r.data.collection || []);
        cancelPage = r.data.pagination?.next_page || null;
      } catch { break; }
    }

    // ─── Zoho: Waymo leads (all pages) ───────────────────────────────────
    let waymoLeads = [];
    let page = 1;
    let more = true;
    while (more && page <= 10) {
      const d = await zohoGet(`/crm/v2/Leads/search?criteria=(Lead_Source:equals:Waymo)&per_page=200&page=${page}`);
      waymoLeads = waymoLeads.concat(d.data || []);
      more = d.info?.more_records || false;
      page++;
    }

    // ─── Zoho: Deals (all pages, up to 1000) ────────────────────────────
    let deals = [];
    page = 1; more = true;
    while (more && page <= 5) {
      const d = await zohoGet(`/crm/v2/Deals?per_page=200&page=${page}`);
      deals = deals.concat(d.data || []);
      more = d.info?.more_records || false;
      page++;
    }

    // ─── Compute per-rep stats ───────────────────────────────────────────
    const repStats = {};

    // Initialize reps
    REP_NAMES.forEach(name => {
      repStats[name] = { calendly_active: 0, calendly_canceled: 0, waymo_leads: 0, waymo_house: 0, deals_total: 0, deals_won: 0, deals_qualification: 0, deal_amount: 0 };
    });

    // Calendly by member
    calEvents.forEach(e => {
      (e.event_memberships || []).forEach(m => {
        const name = m.user_name || '';
        if (repStats[name]) repStats[name].calendly_active++;
      });
    });
    calCanceled.forEach(e => {
      (e.event_memberships || []).forEach(m => {
        const name = m.user_name || '';
        if (repStats[name]) repStats[name].calendly_canceled++;
      });
    });

    // Waymo leads: if owner is a rep = showed up, if owner is House = no-show
    // But we need to know original rep. Use Created_By or track differently.
    // Logic: leads currently owned by a rep = showed up for that rep
    // Leads owned by House = no-show (we attribute to... we can't tell original rep from current data)
    // Alternative: count total Waymo leads assigned to each rep + House transfers
    const houseCount = waymoLeads.filter(l => (l.Owner?.name || '').includes('House')).length;
    waymoLeads.forEach(l => {
      const owner = l.Owner?.name || '';
      if (repStats[owner]) {
        repStats[owner].waymo_leads++;
      }
    });

    // Deals by owner
    deals.forEach(d => {
      const owner = d.Owner?.name || '';
      if (repStats[owner]) {
        repStats[owner].deals_total++;
        if (d.Stage === 'Closed Won') {
          repStats[owner].deals_won++;
          repStats[owner].deal_amount += (d.Amount || 0);
        }
        if (d.Stage === 'Qualification') repStats[owner].deals_qualification++;
      }
    });

    // Build response with computed percentages
    const repBreakdown = {};
    Object.entries(repStats).forEach(([name, s]) => {
      const calTotal = s.calendly_active + s.calendly_canceled;
      const showUpRate = calTotal > 0 ? Math.round((s.calendly_active / calTotal) * 100) : null;
      const leadToApp = s.waymo_leads > 0 ? Math.round((s.deals_total / s.waymo_leads) * 100) : null;
      const fundingRate = s.deals_total > 0 ? Math.round((s.deals_won / s.deals_total) * 100) : null;
      const avgDealSize = s.deals_won > 0 ? Math.round(s.deal_amount / s.deals_won) : null;

      if (calTotal > 0 || s.waymo_leads > 0 || s.deals_total > 0) {
        repBreakdown[name] = {
          calendly_scheduled: calTotal,
          calendly_active: s.calendly_active,
          calendly_canceled: s.calendly_canceled,
          show_up_rate: showUpRate,
          waymo_leads: s.waymo_leads,
          deals_total: s.deals_total,
          deals_won: s.deals_won,
          deals_in_qualification: s.deals_qualification,
          lead_to_app_rate: leadToApp,
          funding_rate: fundingRate,
          avg_deal_size: avgDealSize,
          total_funded_amount: s.deal_amount,
        };
      }
    });

    // Totals
    const totalCalScheduled = calEvents.length + calCanceled.length;
    const totalWaymoLeads = waymoLeads.length;
    const totalDeals = deals.length;
    const totalWon = deals.filter(d => d.Stage === 'Closed Won').length;
    const totalAmount = deals.filter(d => d.Stage === 'Closed Won').reduce((s, d) => s + (d.Amount || 0), 0);

    res.json({
      period: { days: parseInt(days), from: minDate, to: maxDate },
      totals: {
        calendly_scheduled: totalCalScheduled,
        calendly_active: calEvents.length,
        calendly_canceled: calCanceled.length,
        show_up_rate: totalCalScheduled > 0 ? Math.round((calEvents.length / totalCalScheduled) * 100) : 0,
        waymo_leads_total: totalWaymoLeads,
        waymo_house_transfers: houseCount,
        deals_total: totalDeals,
        deals_won: totalWon,
        funding_rate: totalDeals > 0 ? Math.round((totalWon / totalDeals) * 100) : 0,
        total_funded_amount: totalAmount,
        avg_deal_size: totalWon > 0 ? Math.round(totalAmount / totalWon) : 0,
      },
      rep_breakdown: repBreakdown,
      events: calEvents.slice(0, 50),
    });
  } catch (e) {
    console.error('[Waymo Metrics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
