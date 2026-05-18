const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const CALENDLY_TOKEN = process.env.CALENDLY_API_KEY || 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc5MTEzMDU2LCJqdGkiOiIxOGQyMmY3Zi00NTU3LTQyNGEtYmQ1NC0xOTgzMTk1MTkwNTEiLCJ1c2VyX3V1aWQiOiIwNjgyOGRlMC03NWU2LTQ2ZGMtOGE5OC05YTcwNGRjYjhkZDYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.hf4QpV1uBLg8NyFwNPUGz3-5qy3uIKktX9LgeExfw7ZZZHHTx2u9xLZWyUy-Er7p1a7mL7PKbDF-EoI-K99oNQ';
const CALENDLY_ORG = 'https://api.calendly.com/organizations/ed8ab3ad-c27d-4fea-89a7-9c2fbcf5e1d0';
const BASE = 'https://api.calendly.com';

const hdrs = () => ({ Authorization: `Bearer ${CALENDLY_TOKEN}`, 'Content-Type': 'application/json' });

// GET /api/calendly/events - Org-wide scheduled events
router.get('/events', async (req, res) => {
  try {
    const { status = 'active', count = 50, min_start_time, max_start_time } = req.query;
    const params = new URLSearchParams({ organization: CALENDLY_ORG, count, status });
    if (min_start_time) params.append('min_start_time', min_start_time);
    if (max_start_time) params.append('max_start_time', max_start_time);
    const resp = await fetch(`${BASE}/scheduled_events?${params}`, { headers: hdrs() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    res.json(await resp.json());
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/events/:eventId/invitees
router.get('/events/:eventId/invitees', async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/scheduled_events/${req.params.eventId}/invitees`, { headers: hdrs() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    res.json(await resp.json());
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/event-types
router.get('/event-types', async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/event_types?organization=${CALENDLY_ORG}&count=50`, { headers: hdrs() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    res.json(await resp.json());
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/metrics - Org-wide aggregated metrics
router.get('/metrics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const minDate = new Date(Date.now() - days * 86400000).toISOString();
    const maxDate = new Date().toISOString();

    // Fetch all active events org-wide
    let allEvents = [];
    let nextPage = `${BASE}/scheduled_events?organization=${CALENDLY_ORG}&count=100&min_start_time=${minDate}&max_start_time=${maxDate}&status=active`;
    while (nextPage) {
      const resp = await fetch(nextPage, { headers: hdrs() });
      if (!resp.ok) break;
      const data = await resp.json();
      allEvents = allEvents.concat(data.collection || []);
      nextPage = data.pagination?.next_page || null;
    }

    // Fetch canceled events org-wide
    let canceledEvents = [];
    let cancelPage = `${BASE}/scheduled_events?organization=${CALENDLY_ORG}&count=100&status=canceled&min_start_time=${minDate}&max_start_time=${maxDate}`;
    while (cancelPage) {
      const resp = await fetch(cancelPage, { headers: hdrs() });
      if (!resp.ok) break;
      const data = await resp.json();
      canceledEvents = canceledEvents.concat(data.collection || []);
      cancelPage = data.pagination?.next_page || null;
    }

    const totalScheduled = allEvents.length + canceledEvents.length;
    const totalActive = allEvents.length;
    const totalCanceled = canceledEvents.length;
    const cancelRate = totalScheduled > 0 ? Math.round((totalCanceled / totalScheduled) * 100) : 0;

    // By day
    const byDay = {};
    allEvents.forEach(e => {
      const day = e.start_time?.slice(0, 10);
      if (day) byDay[day] = (byDay[day] || 0) + 1;
    });

    // By event type
    const byType = {};
    allEvents.forEach(e => {
      const name = e.name || 'Unknown';
      byType[name] = (byType[name] || 0) + 1;
    });

    // By team member (from event_memberships)
    const byMember = {};
    const canceledByMember = {};
    allEvents.forEach(e => {
      (e.event_memberships || []).forEach(m => {
        const name = m.user_name || m.user_email || 'Unknown';
        byMember[name] = (byMember[name] || 0) + 1;
      });
    });
    canceledEvents.forEach(e => {
      (e.event_memberships || []).forEach(m => {
        const name = m.user_name || m.user_email || 'Unknown';
        canceledByMember[name] = (canceledByMember[name] || 0) + 1;
      });
    });

    // Per-rep breakdown with show-up rate (active / total scheduled per rep)
    const repBreakdown = {};
    const allMembers = new Set([...Object.keys(byMember), ...Object.keys(canceledByMember)]);
    allMembers.forEach(name => {
      const active = byMember[name] || 0;
      const canceled = canceledByMember[name] || 0;
      const total = active + canceled;
      repBreakdown[name] = {
        scheduled: total,
        active,
        canceled,
        show_up_rate: total > 0 ? Math.round((active / total) * 100) : 0,
      };
    });

    res.json({
      period: { days: parseInt(days), from: minDate, to: maxDate },
      totals: { scheduled: totalScheduled, active: totalActive, canceled: totalCanceled, cancel_rate: cancelRate, show_up_rate: totalScheduled > 0 ? Math.round((totalActive / totalScheduled) * 100) : 0 },
      by_day: byDay,
      by_type: byType,
      by_member: byMember,
      rep_breakdown: repBreakdown,
      events: allEvents.slice(0, 100),
    });
  } catch (e) {
    console.error('[Calendly Metrics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
