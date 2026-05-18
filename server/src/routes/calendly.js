const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const CALENDLY_TOKEN = process.env.CALENDLY_API_KEY || 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc5MTEzMDU2LCJqdGkiOiIxOGQyMmY3Zi00NTU3LTQyNGEtYmQ1NC0xOTgzMTk1MTkwNTEiLCJ1c2VyX3V1aWQiOiIwNjgyOGRlMC03NWU2LTQ2ZGMtOGE5OC05YTcwNGRjYjhkZDYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.hf4QpV1uBLg8NyFwNPUGz3-5qy3uIKktX9LgeExfw7ZZZHHTx2u9xLZWyUy-Er7p1a7mL7PKbDF-EoI-K99oNQ';
const CALENDLY_USER = 'https://api.calendly.com/users/06828de0-75e6-46dc-8a98-9a704dcb8dd6';
const CALENDLY_ORG = 'https://api.calendly.com/organizations/ed8ab3ad-c27d-4fea-89a7-9c2fbcf5e1d0';
const BASE = 'https://api.calendly.com';

const headers = () => ({ Authorization: `Bearer ${CALENDLY_TOKEN}`, 'Content-Type': 'application/json' });

// GET /api/calendly/events - Get scheduled events
router.get('/events', async (req, res) => {
  try {
    const { status = 'active', count = 50, min_start_time, max_start_time } = req.query;
    const params = new URLSearchParams({ user: CALENDLY_USER, count, status });
    if (min_start_time) params.append('min_start_time', min_start_time);
    if (max_start_time) params.append('max_start_time', max_start_time);

    const resp = await fetch(`${BASE}/scheduled_events?${params}`, { headers: headers() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    const data = await resp.json();
    res.json(data);
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/events/:eventId/invitees - Get invitees for an event
router.get('/events/:eventId/invitees', async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/scheduled_events/${req.params.eventId}/invitees`, { headers: headers() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    res.json(await resp.json());
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/event-types - Get all event types
router.get('/event-types', async (req, res) => {
  try {
    const resp = await fetch(`${BASE}/event_types?user=${CALENDLY_USER}&count=50`, { headers: headers() });
    if (!resp.ok) throw new Error(`Calendly ${resp.status}`);
    res.json(await resp.json());
  } catch (e) {
    console.error('[Calendly]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/calendly/metrics - Aggregated metrics
router.get('/metrics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const minDate = new Date(Date.now() - days * 86400000).toISOString();
    const maxDate = new Date().toISOString();

    // Fetch all events in range
    let allEvents = [];
    let nextPage = `${BASE}/scheduled_events?user=${CALENDLY_USER}&count=100&min_start_time=${minDate}&max_start_time=${maxDate}`;

    while (nextPage) {
      const resp = await fetch(nextPage, { headers: headers() });
      if (!resp.ok) break;
      const data = await resp.json();
      allEvents = allEvents.concat(data.collection || []);
      nextPage = data.pagination?.next_page || null;
    }

    // Also fetch canceled
    let canceledEvents = [];
    let cancelPage = `${BASE}/scheduled_events?user=${CALENDLY_USER}&count=100&status=canceled&min_start_time=${minDate}&max_start_time=${maxDate}`;
    while (cancelPage) {
      const resp = await fetch(cancelPage, { headers: headers() });
      if (!resp.ok) break;
      const data = await resp.json();
      canceledEvents = canceledEvents.concat(data.collection || []);
      cancelPage = data.pagination?.next_page || null;
    }

    // Compute metrics
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

    // By team member
    const byMember = {};
    allEvents.forEach(e => {
      (e.event_memberships || []).forEach(m => {
        const name = m.user_name || m.user_email || 'Unknown';
        byMember[name] = (byMember[name] || 0) + 1;
      });
    });

    res.json({
      period: { days: parseInt(days), from: minDate, to: maxDate },
      totals: { scheduled: totalScheduled, active: totalActive, canceled: totalCanceled, cancel_rate: cancelRate },
      by_day: byDay,
      by_type: byType,
      by_member: byMember,
      events: allEvents.slice(0, 100),
    });
  } catch (e) {
    console.error('[Calendly Metrics]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
