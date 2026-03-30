export const ROLES = { CLIENT: 'client', REP: 'rep', ADMIN: 'admin' };

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
  { id: 'u2', name: 'Sarah Mitchell', email: 'rep@demo.com', password: 'password', role: ROLES.REP, repId: 'r1', clientId: null },
  { id: 'u3', name: 'James Carter', email: 'rep2@demo.com', password: 'password', role: ROLES.REP, repId: 'r2', clientId: null },
  { id: 'u4', name: 'Darnell Williams', email: 'client@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c1' },
  { id: 'u5', name: 'Maria Gonzalez', email: 'client2@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c2' },
  { id: 'u6', name: 'Tony Russo', email: 'client3@demo.com', password: 'password', role: ROLES.CLIENT, repId: null, clientId: 'c3' },
];

export const REPS = [
  { id: 'r-nik', name: 'Nikholas Lazo', email: 'nikholas@capital-infusion.com', team: 'Capital Infusion', active: true, phone: '' },
  { id: 'r1', name: 'Sarah Mitchell', email: 'rep@demo.com', team: 'East Coast', active: true, phone: '(212) 555-0101' },
  { id: 'r2', name: 'James Carter', email: 'rep2@demo.com', team: 'West Coast', active: true, phone: '(310) 555-0202' },
];

export const CLIENTS = [
  { id: 'c1', businessName: 'Williams Auto Repair', ownerName: 'Darnell Williams', assignedRepId: 'r1', status: 'Active', email: 'client@demo.com', phone: '(404) 555-0301', industry: 'Automotive', requestedAmount: 75000, state: 'GA' },
  { id: 'c2', businessName: 'Gonzalez Catering Co.', ownerName: 'Maria Gonzalez', assignedRepId: 'r1', status: 'Pending', email: 'client2@demo.com', phone: '(305) 555-0302', industry: 'Food & Beverage', requestedAmount: 50000, state: 'FL' },
  { id: 'c3', businessName: 'Russo Plumbing LLC', ownerName: 'Tony Russo', assignedRepId: 'r2', status: 'Under Review', email: 'client3@demo.com', phone: '(718) 555-0303', industry: 'Construction', requestedAmount: 120000, state: 'NY' },
  { id: 'c4', businessName: 'Bright Horizons Daycare', ownerName: 'Linda Park', assignedRepId: 'r2', status: 'Approved', email: 'linda@demo.com', phone: '(213) 555-0304', industry: 'Education', requestedAmount: 40000, state: 'CA' },
];

export const DOCUMENTS = [
  { id: 'd1', clientId: 'c1', repId: 'r1', category: 'drivers_license', fileName: 'darnell_dl_front.pdf', uploadedBy: 'u4', uploadedAt: '2025-06-01T10:30:00Z', status: DOC_STATUS.APPROVED, visibility: 'all', tags: ['id', 'verified'], note: '', fileSize: '1.2 MB' },
  { id: 'd2', clientId: 'c1', repId: 'r1', category: 'bank_statements', fileName: 'williams_auto_oct_2024.pdf', uploadedBy: 'u4', uploadedAt: '2025-06-02T14:00:00Z', status: DOC_STATUS.UNDER_REVIEW, visibility: 'all', tags: ['oct', '2024'], note: 'Oct statement', fileSize: '3.4 MB' },
  { id: 'd3', clientId: 'c1', repId: 'r1', category: 'bank_statements', fileName: 'williams_auto_nov_2024.pdf', uploadedBy: 'u4', uploadedAt: '2025-06-02T14:05:00Z', status: DOC_STATUS.UNDER_REVIEW, visibility: 'all', tags: ['nov', '2024'], note: 'Nov statement', fileSize: '3.1 MB' },
  { id: 'd4', clientId: 'c1', repId: 'r1', category: 'application', fileName: 'williams_auto_application.pdf', uploadedBy: 'u2', uploadedAt: '2025-05-28T09:00:00Z', status: DOC_STATUS.APPROVED, visibility: 'all', tags: ['signed'], note: '', fileSize: '0.8 MB' },
  { id: 'd5', clientId: 'c1', repId: 'r1', category: 'voided_check', fileName: 'voided_check.png', uploadedBy: 'u4', uploadedAt: '2025-06-03T11:00:00Z', status: DOC_STATUS.APPROVED, visibility: 'all', tags: [], note: '', fileSize: '0.5 MB' },
  { id: 'd6', clientId: 'c2', repId: 'r1', category: 'application', fileName: 'gonzalez_application.pdf', uploadedBy: 'u2', uploadedAt: '2025-06-05T10:00:00Z', status: DOC_STATUS.APPROVED, visibility: 'all', tags: [], note: '', fileSize: '0.9 MB' },
  { id: 'd7', clientId: 'c2', repId: 'r1', category: 'bank_statements', fileName: 'gonzalez_oct_2024.pdf', uploadedBy: 'u5', uploadedAt: '2025-06-06T13:00:00Z', status: DOC_STATUS.NEEDS_REUPLOAD, visibility: 'all', tags: [], note: 'Pages missing — please reupload', fileSize: '2.1 MB' },
  { id: 'd8', clientId: 'c3', repId: 'r2', category: 'drivers_license', fileName: 'russo_id.pdf', uploadedBy: 'u6', uploadedAt: '2025-06-07T09:30:00Z', status: DOC_STATUS.APPROVED, visibility: 'all', tags: [], note: '', fileSize: '1.0 MB' },
  { id: 'd9', clientId: 'c3', repId: 'r2', category: 'bank_statements', fileName: 'russo_plumbing_sept.pdf', uploadedBy: 'u6', uploadedAt: '2025-06-07T10:00:00Z', status: DOC_STATUS.UNDER_REVIEW, visibility: 'all', tags: [], note: '', fileSize: '4.2 MB' },
  { id: 'd10', clientId: 'c1', repId: 'r1', category: 'misc', fileName: 'internal_notes_williams.txt', uploadedBy: 'u2', uploadedAt: '2025-06-04T16:00:00Z', status: DOC_STATUS.UPLOADED, visibility: 'internal', tags: ['internal'], note: 'Strong candidate — fast approval recommended', fileSize: '0.1 MB' },
];

export const DOCUMENT_REQUESTS = [
  { id: 'req1', clientId: 'c1', requestedBy: 'u2', category: 'bank_statements', instructions: 'Please upload the most recent 3 months of bank statements.', dueDate: '2025-06-15', status: 'Pending', createdAt: '2025-06-01T08:00:00Z' },
  { id: 'req2', clientId: 'c2', requestedBy: 'u2', category: 'bank_statements', instructions: 'Reupload October statement — pages 3-5 were missing.', dueDate: '2025-06-12', status: 'Pending', createdAt: '2025-06-06T14:00:00Z' },
  { id: 'req3', clientId: 'c2', requestedBy: 'u2', category: 'voided_check', instructions: 'Please provide a voided check for ACH setup.', dueDate: '2025-06-14', status: 'Pending', createdAt: '2025-06-06T14:05:00Z' },
  { id: 'req4', clientId: 'c3', requestedBy: 'u3', category: 'signed_agreement', instructions: 'Please sign and return the merchant agreement.', dueDate: '2025-06-18', status: 'Pending', createdAt: '2025-06-07T11:00:00Z' },
  { id: 'req5', clientId: 'c4', requestedBy: 'u3', category: 'funding_docs', instructions: 'Upload final funding authorization form.', dueDate: '2025-06-20', status: 'Completed', createdAt: '2025-06-05T09:00:00Z' },
];

export const ACTIVITY_LOG = [
  { id: 'a1', clientId: 'c1', repId: 'r1', eventType: 'upload', description: 'Uploaded drivers_license: darnell_dl_front.pdf', createdAt: '2025-06-01T10:30:00Z', createdBy: 'u4' },
  { id: 'a2', clientId: 'c1', repId: 'r1', eventType: 'status_change', description: 'Document darnell_dl_front.pdf marked Approved', createdAt: '2025-06-01T15:00:00Z', createdBy: 'u2' },
  { id: 'a3', clientId: 'c1', repId: 'r1', eventType: 'upload', description: 'Uploaded bank_statements: williams_auto_oct_2024.pdf', createdAt: '2025-06-02T14:00:00Z', createdBy: 'u4' },
  { id: 'a4', clientId: 'c1', repId: 'r1', eventType: 'request', description: 'Document request sent: Bank Statements (3 months)', createdAt: '2025-06-01T08:00:00Z', createdBy: 'u2' },
  { id: 'a5', clientId: 'c2', repId: 'r1', eventType: 'upload', description: 'Uploaded bank_statements: gonzalez_oct_2024.pdf', createdAt: '2025-06-06T13:00:00Z', createdBy: 'u5' },
  { id: 'a6', clientId: 'c2', repId: 'r1', eventType: 'status_change', description: 'Document gonzalez_oct_2024.pdf marked Needs Reupload', createdAt: '2025-06-06T16:00:00Z', createdBy: 'u2' },
  { id: 'a7', clientId: 'c3', repId: 'r2', eventType: 'upload', description: 'Uploaded drivers_license: russo_id.pdf', createdAt: '2025-06-07T09:30:00Z', createdBy: 'u6' },
  { id: 'a8', clientId: 'c3', repId: 'r2', eventType: 'request', description: 'Document request sent: Signed Agreement', createdAt: '2025-06-07T11:00:00Z', createdBy: 'u3' },
  { id: 'a9', clientId: 'c1', repId: 'r1', eventType: 'note', description: 'Internal note added by Sarah Mitchell', createdAt: '2025-06-04T16:00:00Z', createdBy: 'u2' },
  { id: 'a10', clientId: 'c4', repId: 'r2', eventType: 'status_change', description: 'Client status changed to Approved', createdAt: '2025-06-08T10:00:00Z', createdBy: 'u1' },
];

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
