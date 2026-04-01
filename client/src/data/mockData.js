export const ROLES = { CLIENT: 'client', REP: 'rep', TEAM_LEAD: 'team_lead', ADMIN: 'admin' };

export const DOC_STATUS = {
  MISSING: 'Missing',
  REQUESTED: 'Requested',
  UPLOADED: 'Uploaded',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  NEEDS_REUPLOAD: 'Needs Reupload',
};

export const DOC_CATEGORIES = [
  { id: 'drivers_license', label: "Driver's License / ID", icon: '🪪' },
  { id: 'application', label: 'Application', icon: '📋' },
  { id: 'bank_statements', label: 'Bank Statements', icon: '🏦' },
  { id: 'voided_check', label: 'Voided Check', icon: '✅' },
  { id: 'signed_agreement', label: 'Signed Agreement', icon: '✍️' },
  { id: 'funding_docs', label: 'Funding Documents', icon: '💰' },
  { id: 'misc', label: 'Miscellaneous', icon: '📁' },
];

export const USERS = [
  { id: 'u1', name: 'Alex Stetkevych', email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!', role: ROLES.ADMIN, repId: null, clientId: null },
  { id: 'u-nik', name: 'Nikholas Lazo', email: 'nikholas@capital-infusion.com', password: 'AppPullingBeast23', role: ROLES.REP, repId: 'r-nik', clientId: null },
  { id: 'u-chris', name: 'Christopher Cranton', email: 'christopher.cranton@gmail.com', password: 'chrisbuildstech123', role: ROLES.REP, repId: 'r-chris', clientId: null },
  { id: 'u2', name: 'Sarah Mitchell', email: 'rep@demo.com', password: 'password', role: ROLES.REP, repId: 'r1', clientId: null },
  { id: 'u3', name: 'James Carter', email: 'rep2@demo.com', password: 'password', role: ROLES.REP, repId: 'r2', clientId: null },
  { id: 'u4', name: 'Darnell Williams', email: 'client@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c1' },
  { id: 'u5', name: 'Maria Gonzalez', email: 'client2@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c2' },
  { id: 'u6', name: 'Tony Russo', email: 'client3@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c3' },
];

export const REPS = [
  { id: 'r-nik', name: 'Nikholas Lazo', email: 'nikholas@capital-infusion.com', team: 'Capital Infusion', active: true, phone: '' },
  { id: 'r-chris', name: 'Christopher Cranton', email: 'christopher.cranton@gmail.com', team: 'Capital Infusion', active: true, phone: '' },
  { id: 'r1', name: 'Sarah Mitchell', email: 'rep@demo.com', team: 'East Coast', active: true, phone: '(212) 555-0101' },
  { id: 'r2', name: 'James Carter', email: 'rep2@demo.com', team: 'West Coast', active: true, phone: '(310) 555-0202' },
];

export const CLIENTS = [
  { id: 'c1', businessName: 'Williams Auto Repair', ownerName: 'Darnell Williams', assignedRepId: 'r1', status: 'Active', email: 'client@demo.com', phone: '(404) 555-0301', industry: 'Automotive', requestedAmount: 75000, state: 'GA' },
  { id: 'c2', businessName: 'Gonzalez Catering Co.', ownerName: 'Maria Gonzalez', assignedRepId: 'r1', status: 'Pending', email: 'client2@demo.com', phone: '(305) 555-0302', industry: 'Food & Beverage', requestedAmount: 50000, state: 'FL' },
  { id: 'c3', businessName: 'Russo Plumbing LLC', ownerName: 'Tony Russo', assignedRepId: 'r2', status: 'Under Review', email: 'client3@demo.com', phone: '(718) 555-0303', industry: 'Construction', requestedAmount: 120000, state: 'NY' },
  { id: 'c4', businessName: 'Bright Horizons Daycare', ownerName: 'Linda Park', assignedRepId: 'r2', status: 'Approved', email: 'linda@demo.com', phone: '(213) 555-0304', industry: 'Education', requestedAmount: 40000, state: 'CA' },
];

export const DOCUMENTS = [];

export const DOCUMENT_REQUESTS = [];

export const ACTIVITY_LOG = [];

export const getClientsByRep = (repId) => CLIENTS.filter(c => c.assignedRepId === repId);
export const getDocumentsByClient = (clientId) => DOCUMENTS.filter(d => d.clientId === clientId);
export const getDocumentsByCategory = (clientId, category) => DOCUMENTS.filter(d => d.clientId === clientId && d.category === category);
export const getRequestsByClient = (clientId) => DOCUMENT_REQUESTS.filter(r => r.clientId === clientId);
export const getActivityByClient = (clientId) => ACTIVITY_LOG.filter(a => a.clientId === clientId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
export const getMissingCategories = (clientId) => {
  const uploaded = new Set(getDocumentsByClient(clientId).map(d => d.category));
  return DOC_CATEGORIES.filter(c => !uploaded.has(c.id));
};
export const getUserByEmail = (email) => USERS.find(u => u.email === email) || null;
export const getRepById = (repId) => REPS.find(r => r.id === repId) || null;
export const getClientById = (clientId) => CLIENTS.find(c => c.id === clientId) || null;
