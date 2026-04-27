const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const FILE = 'nexus_training_responses.json';

router.use(authMiddleware);

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET /api/nexus/training-library
router.get('/training-library', adminOnly, async (req, res) => {
  try {
    const lib = await loadFromS3(FILE).catch(() => []);
    const { category, tone, q } = req.query;
    let filtered = Array.isArray(lib) ? lib : [];
    if (category) filtered = filtered.filter(r => r.category === category);
    if (tone) filtered = filtered.filter(r => r.tone === tone);
    if (q) {
      const lq = q.toLowerCase();
      filtered = filtered.filter(r =>
        (r.original_prompt || '').toLowerCase().includes(lq) ||
        (r.improved_response || '').toLowerCase().includes(lq) ||
        (r.tags || []).some(t => t.toLowerCase().includes(lq))
      );
    }
    res.json(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/nexus/search-training-library — semantic-ish search by prompt similarity
router.post('/search-training-library', adminOnly, async (req, res) => {
  try {
    const { prompt, category, tone, limit = 5 } = req.body;
    const lib = await loadFromS3(FILE).catch(() => []);
    if (!Array.isArray(lib) || !lib.length) return res.json([]);
    const words = (prompt || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let scored = lib.map(r => {
      const text = `${r.original_prompt} ${r.improved_response} ${(r.tags || []).join(' ')}`.toLowerCase();
      const hits = words.filter(w => text.includes(w)).length;
      return { ...r, _score: hits };
    }).filter(r => r._score > 0);
    if (category) scored = scored.filter(r => r.category === category);
    if (tone) scored = scored.filter(r => r.tone === tone);
    scored.sort((a, b) => b._score - a._score || b.usage_count - a.usage_count);
    res.json(scored.slice(0, limit).map(({ _score, ...r }) => r));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/nexus/save-training-response
router.post('/save-training-response', adminOnly, async (req, res) => {
  try {
    const { original_prompt, original_bot_response, improved_response, category, tone, tags, notes } = req.body;
    if (!original_prompt || !improved_response) return res.status(400).json({ error: 'prompt and improved_response required' });
    const lib = await loadFromS3(FILE).catch(() => []);
    const entry = {
      id: `ntr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      original_prompt,
      original_bot_response: original_bot_response || '',
      improved_response,
      category: category || 'general',
      tone: tone || 'professional',
      tags: tags || [],
      approved_by: req.user.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      usage_count: 0,
      effectiveness_score: 0,
      notes: notes || '',
    };
    lib.push(entry);
    await saveToS3(FILE, lib);
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/nexus/training-response/:id
router.patch('/training-response/:id', adminOnly, async (req, res) => {
  try {
    const lib = await loadFromS3(FILE).catch(() => []);
    const idx = lib.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const allowed = ['improved_response', 'category', 'tone', 'tags', 'notes', 'effectiveness_score'];
    for (const k of allowed) { if (req.body[k] !== undefined) lib[idx][k] = req.body[k]; }
    lib[idx].updated_at = new Date().toISOString();
    await saveToS3(FILE, lib);
    res.json(lib[idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/nexus/training-response/:id
router.delete('/training-response/:id', adminOnly, async (req, res) => {
  try {
    const lib = await loadFromS3(FILE).catch(() => []);
    const filtered = lib.filter(r => r.id !== req.params.id);
    if (filtered.length === lib.length) return res.status(404).json({ error: 'Not found' });
    await saveToS3(FILE, filtered);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/nexus/generate-response — mock generation with RAG from training library
router.post('/generate-response', adminOnly, async (req, res) => {
  try {
    const { prompt, category, tone } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Search for similar approved examples
    const lib = await loadFromS3(FILE).catch(() => []);
    const words = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let examples = (Array.isArray(lib) ? lib : []).map(r => {
      const text = `${r.original_prompt} ${r.improved_response} ${(r.tags || []).join(' ')}`.toLowerCase();
      const hits = words.filter(w => text.includes(w)).length;
      return { ...r, _score: hits };
    }).filter(r => r._score > 0);
    if (category) examples = examples.filter(r => r.category === category);
    if (tone) examples = examples.filter(r => r.tone === tone);
    examples.sort((a, b) => b._score - a._score);
    const topExamples = examples.slice(0, 5).map(({ _score, ...r }) => r);

    // Increment usage_count on matched examples
    if (topExamples.length && lib.length) {
      const ids = new Set(topExamples.map(e => e.id));
      for (const r of lib) { if (ids.has(r.id)) r.usage_count = (r.usage_count || 0) + 1; }
      await saveToS3(FILE, lib).catch(() => {});
    }

    // Mock response — replace with real AI call later
    const toneMap = {
      professional: 'Thank you for your interest. ',
      'aggressive sales': 'Let\'s get this done today. ',
      friendly: 'Hey! Great to hear from you. ',
      concise: '',
      'MCA expert': 'Based on your business profile, ',
    };
    const prefix = toneMap[tone] || toneMap.professional;
    let mockResponse;
    if (topExamples.length) {
      mockResponse = `${prefix}${topExamples[0].improved_response}`;
    } else {
      mockResponse = `${prefix}I'd be happy to help with "${prompt}". Our team at Capital Infusion specializes in fast, flexible business funding. We can typically review your application within 24 hours of receiving your bank statements. Would you like to get started?`;
    }

    res.json({
      generated_response: mockResponse,
      examples_used: topExamples,
      is_mock: true,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
