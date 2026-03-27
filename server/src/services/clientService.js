// In-memory store for now — replace with DB insert when backend is wired
const pendingClients = [];

async function createPendingClient({ email, name, envelopeId, source }) {
  const existing = pendingClients.find(c => c.email === email);
  if (existing) {
    console.log(`[Client] Already exists: ${email}`);
    return existing;
  }

  const client = {
    id: `pending_${Date.now()}`,
    email,
    name,
    envelopeId,
    source,
    status: 'Pending Registration',
    createdAt: new Date().toISOString(),
  };

  pendingClients.push(client);
  console.log(`[Client] Created pending client: ${email}`);

  // TODO: Replace with DB insert:
  // await db.query(
  //   'INSERT INTO pending_clients (email, name, envelope_id, source) VALUES ($1,$2,$3,$4)',
  //   [email, name, envelopeId, source]
  // );

  return client;
}

async function getPendingClients() {
  return pendingClients;
}

module.exports = { createPendingClient, getPendingClients };
