const ClientStore = require('./clientStore');

// Map sender emails to rep IDs
const REP_EMAIL_MAP = {
  'alexs@capital-infusion.com': null, // admin — assign to self
  'nikholas@capital-infusion.com': 'r-nik',
  'anthonyd@capital-infusion.com': 'r-anthony',
};

async function createPendingClient({ email, name, envelopeId, source, senderEmail }) {
  // Check if client already exists by email
  const existing = ClientStore.getByEmail(email);
  if (existing) {
    // Update with envelope info if not already set
    if (!existing.envelopeId) {
      ClientStore.update(existing.id, { envelopeId, source: source || 'docusign' });
    }
    console.log(`[Client] Already exists: ${email} — linked envelope ${envelopeId}`);
    return existing;
  }

  // Determine which rep sent the DocuSign
  let assignedRepId = null;
  if (senderEmail) {
    assignedRepId = REP_EMAIL_MAP[senderEmail.toLowerCase()] || null;
  }

  // Parse name into owner name and placeholder business name
  const ownerName = name || 'Unknown';
  const businessName = `${ownerName}'s Business`; // placeholder until client updates

  const client = ClientStore.create({
    businessName,
    ownerName,
    email,
    phone: '',
    industry: '',
    state: '',
    requestedAmount: 0,
    assignedRepId,
    assignedRepName: senderEmail || '',
    status: 'Pending',
    source: source || 'docusign',
    envelopeId,
  });

  console.log(`[Client] Created from DocuSign: ${email} → rep ${assignedRepId || 'unassigned'}`);
  return client;
}

async function getPendingClients() {
  return ClientStore.getAll().filter(c => c.source === 'docusign');
}

module.exports = { createPendingClient, getPendingClients };
