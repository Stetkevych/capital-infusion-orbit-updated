const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ── OpenAI setup ──
let openai = null;
const MOCK = !process.env.OPENAI_API_KEY?.trim();
if (!MOCK) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── State enum ──
const BotRole = {
  GREETING: 'GREETING',
  COLLECT_EMAIL: 'COLLECT_EMAIL',
  VALIDATE_EMAIL: 'VALIDATE_EMAIL',
  AWAIT_DOCUSIGN: 'AWAIT_DOCUSIGN',
  COLLECT_BUSINESS_INFO: 'COLLECT_BUSINESS_INFO',
  COMPLETED_DOCUSIGN: 'COMPLETED_DOCUSIGN',
  OFFER_ORBIT: 'OFFER_ORBIT',
  CONVERSATIONAL: 'CONVERSATIONAL',
};

// ── Bot voice variants (mock fallback) ──
const VOICE = {
  [BotRole.GREETING]: {
    first: ['Welcome to Capital Infusion. I can get this moving quickly if you send me the best email for your agreement.'],
    retry: ['As soon as I have the right email, I can send the agreement out and keep momentum on your file.', 'No pressure. I just need the best email for the paperwork so I can move the next step over to you.'],
  },
  [BotRole.COLLECT_EMAIL]: {
    first: ["Send me the best email for DocuSign and I'll get the agreement out right away."],
    retry: ['Just need the right email address and I can put DocuSign in motion.', "Once I have the email, I'll send the agreement over."],
  },
  [BotRole.VALIDATE_EMAIL]: {
    first: ["Perfect. I sent the DocuSign link to that email. Open it when you're ready."],
    retry: ["You should see the DocuSign shortly. Once it's signed, we're in a strong spot."],
  },
  [BotRole.AWAIT_DOCUSIGN]: {
    first: ['While you review the DocuSign, send me your monthly revenue, time in business, and industry.'],
    retry: ['While the DocuSign is still open, I can keep this moving with revenue, time in business, and industry.'],
  },
  [BotRole.COLLECT_BUSINESS_INFO]: {
    first: ['That helps. Can you also give me a quick read on credit and cashflow?'],
    retry: ['Whenever you can, send over a quick snapshot of credit and cashflow.'],
  },
  [BotRole.COMPLETED_DOCUSIGN]: {
    first: ["Perfect. You're all set there. I'll share the Orbit link so you can track underwriting."],
    retry: ["Now that DocuSign is wrapped, Orbit is where you'll follow the next steps."],
  },
  [BotRole.OFFER_ORBIT]: {
    first: ['Use this Orbit link to track progress: https://orbit-technology.com'],
    retry: ['You can follow your file in Orbit here: https://orbit-technology.com'],
  },
  [BotRole.CONVERSATIONAL]: {
    first: ['Good question. Let me help with that.'],
    retry: ['Sure, let me address that for you.'],
  },
};

function getMockResponse(state, attemptCount) {
  const v = VOICE[state] || VOICE[BotRole.CONVERSATIONAL];
  if (attemptCount === 0) return v.first[0];
  return v.retry[(attemptCount - 1) % v.retry.length];
}

// ── In-memory storage ──
const chatLogs = new Map();
const companyInfo = new Map();

// ── Helpers ──
function extractEmail(text) {
  const m = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return m ? m[0] : null;
}
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function hasCompletedDocusign(t) {
  const n = t.toLowerCase();
  return n.includes('signed') || n.includes('complete') || n.includes('completed') || n.includes('done');
}
function buildTranscript(msgs) { return msgs.map(m => `${m.role}: ${m.text}`).join('\n'); }
function countStateAttempts(state, transcript) {
  if (!transcript) return 0;
  return transcript.split('\n').filter(l => l.startsWith(`${state}:`)).length;
}

function getResponseState(current, userMsg) {
  if (current === BotRole.COLLECT_EMAIL) {
    const email = extractEmail(userMsg);
    if (email && isValidEmail(email)) return BotRole.VALIDATE_EMAIL;
  }
  if ((current === BotRole.AWAIT_DOCUSIGN || current === BotRole.COLLECT_BUSINESS_INFO) && hasCompletedDocusign(userMsg)) {
    return BotRole.COMPLETED_DOCUSIGN;
  }
  return current;
}

const STATE_GOALS = {
  [BotRole.GREETING]: 'Greet the user warmly and guide them toward providing their best email for the DocuSign agreement.',
  [BotRole.COLLECT_EMAIL]: 'Get the user to provide their email address so you can send the DocuSign agreement.',
  [BotRole.VALIDATE_EMAIL]: 'Confirm you received their email and let them know the DocuSign agreement is being sent.',
  [BotRole.AWAIT_DOCUSIGN]: 'The DocuSign has been sent. While they work on signing, gather business context: monthly revenue, time in business, credit situation, industry.',
  [BotRole.COLLECT_BUSINESS_INFO]: "Continue gathering business details: credit score, monthly revenue, cashflow, time in business, industry. Only ask about what you don't already know.",
  [BotRole.COMPLETED_DOCUSIGN]: 'The user completed DocuSign. Congratulate them and introduce Orbit as the next step for tracking underwriting.',
  [BotRole.OFFER_ORBIT]: 'Guide the user to Orbit for tracking their underwriting progress.',
  [BotRole.CONVERSATIONAL]: 'The user is asking something off-topic. Answer their question directly, then gently steer back.',
};

async function generateResponse(state, userMsg, transcript, info) {
  if (MOCK) return getMockResponse(state, countStateAttempts(state, transcript));

  const orbitLink = process.env.ORBIT_LINK || 'https://orbit-technology.com';
  const docusignLink = process.env.DOCUSIGN_LINK || '';
  const companyCtx = Object.keys(info).length > 0
    ? `\nKnown about this user's business: ${Object.entries(info).map(([k, v]) => `${k}: ${v}`).join(', ')}` : '';

  const systemPrompt = `You are a Capital Infusion business finance assistant. You sound like a sharp, confident human — never robotic, never scripted, never generic.
CURRENT PROCESS STEP: ${state}
STEP GOAL: ${STATE_GOALS[state] || STATE_GOALS[BotRole.CONVERSATIONAL]}
${docusignLink ? `DOCUSIGN LINK: ${docusignLink}` : ''}
${state === BotRole.OFFER_ORBIT || state === BotRole.COMPLETED_DOCUSIGN ? `ORBIT LINK: ${orbitLink}` : ''}
${companyCtx}

RULES:
1. ALWAYS read and understand what the user actually said. If they asked a question, ANSWER IT directly.
2. If the user asks "how do I get into DocuSign?" — tell them to check their email for the link.
3. If the user asks about the process, rates, timeline — answer honestly, then continue the conversation.
4. After answering, weave in your step goal naturally — don't force it.
5. If the user gave you exactly what you need, acknowledge it and move forward.
6. Never repeat the same phrasing twice. Read the transcript and vary your language.
7. Keep responses to 2-3 sentences. Sound like a real person texting a client.
8. Reference specific things the user has told you when relevant.`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Full conversation:\n${transcript}\n\nUser just said: "${userMsg}"` },
    ],
    temperature: 0.85,
    max_tokens: 200,
  });
  return res.choices[0]?.message?.content || 'I apologize, I had trouble responding.';
}

async function getNextState(transcript, current, userMsg) {
  if (MOCK) {
    const txt = userMsg.toLowerCase();
    if (current === BotRole.GREETING) return BotRole.COLLECT_EMAIL;
    if (current === BotRole.COLLECT_EMAIL) {
      const email = extractEmail(userMsg);
      return (email && isValidEmail(email)) ? BotRole.VALIDATE_EMAIL : BotRole.COLLECT_EMAIL;
    }
    if (txt.includes('signed') || txt.includes('done') || txt.includes('complete')) return BotRole.COMPLETED_DOCUSIGN;
    if (current === BotRole.VALIDATE_EMAIL) return BotRole.AWAIT_DOCUSIGN;
    if (current === BotRole.AWAIT_DOCUSIGN && /revenue|cashflow|credit|industry|time/.test(txt)) return BotRole.COLLECT_BUSINESS_INFO;
    if (current === BotRole.COMPLETED_DOCUSIGN) return BotRole.OFFER_ORBIT;
    return current;
  }

  const prompt = `Current state: ${current}\nCurrent user message: "${userMsg}"\nFull conversation:\n${transcript}\n\nDetermine the next bot state from: GREETING, COLLECT_EMAIL, VALIDATE_EMAIL, AWAIT_DOCUSIGN, COLLECT_BUSINESS_INFO, COMPLETED_DOCUSIGN, OFFER_ORBIT.\nRespond with ONLY the state name.`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 50,
  });
  return res.choices[0]?.message?.content?.trim() || current;
}

async function extractBusinessInfo(userMsg) {
  if (MOCK) {
    const txt = userMsg.toLowerCase();
    const info = {};
    const rev = txt.match(/\$?\d{3,}[,\d]*/); if (rev) info.revenue = rev[0];
    const tib = txt.match(/\b\d{1,2}\s?(years|yrs|months|mos)\b/); if (tib) info.timeInBusiness = tib[0];
    const ind = txt.match(/\b(retail|restaurant|saas|software|construction|health)\b/); if (ind) info.industry = ind[0];
    return info;
  }
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: 'user', content: `Extract business info from: "${userMsg}". Return JSON with keys: credit, revenue, cashflow, timeInBusiness, industry. Use null for missing.` }],
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    const result = {};
    for (const [k, v] of Object.entries(parsed)) { if (v) result[k] = v; }
    return result;
  } catch { return {}; }
}

// ── POST /api/nexus/chat ──
router.post('/chat', async (req, res) => {
  try {
    const { query, user_id, chat_log: incomingLog } = req.body;

    let chatLog;
    if (!incomingLog) {
      chatLog = { id: uuidv4(), user_id, messages: [], current_state: BotRole.GREETING };
    } else {
      chatLog = chatLogs.get(incomingLog.id) || { ...incomingLog, current_state: incomingLog.current_state || BotRole.GREETING };
    }

    chatLog.messages.push({ id: String(chatLog.messages.length + 1), timestamp: new Date().toISOString(), text: query, role: 'User' });

    const extracted = await extractBusinessInfo(query);
    const currentInfo = companyInfo.get(user_id) || {};
    const updatedInfo = { ...currentInfo, ...extracted };
    if (Object.keys(updatedInfo).length > 0) companyInfo.set(user_id, updatedInfo);

    const responseState = getResponseState(chatLog.current_state, query);
    const transcript = buildTranscript(chatLog.messages);
    const botResponse = await generateResponse(responseState, query, transcript, updatedInfo);

    chatLog.messages.push({ id: String(chatLog.messages.length + 1), timestamp: new Date().toISOString(), text: botResponse, role: responseState });

    const nextState = await getNextState(transcript, responseState, query);
    chatLog.current_state = nextState;
    chatLogs.set(chatLog.id, chatLog);

    res.json({
      message: 'Chat processed successfully',
      bot_response: botResponse,
      next_state: nextState,
      chat_log: { id: chatLog.id, user_id: chatLog.user_id, messages: chatLog.messages, current_state: chatLog.current_state },
      company_info: updatedInfo,
    });
  } catch (err) {
    console.error('[NexusChat] Error:', err.message);
    res.status(500).json({ error: 'Failed to process request', details: err.message });
  }
});

module.exports = router;
