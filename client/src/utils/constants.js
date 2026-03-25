export const USER_ROLES = {
  ADMIN: 'admin',
  SALES_REP: 'sales_rep',
  CLIENT: 'client',
};

export const APPLICATION_STATUSES = {
  INQUIRY: 'inquiry',
  SUBMITTED: 'submitted',
  UNDERWRITING: 'underwriting',
  APPROVED: 'approved',
  FUNDED: 'funded',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
};

export const DEAL_STATUSES = {
  ACTIVE: 'active',
  PAID_OFF: 'paid_off',
  DEFAULTED: 'defaulted',
  PENDING: 'pending',
};

export const DOCUMENT_TYPES = {
  BANK_STATEMENT: 'bank_statement',
  DRIVERS_LICENSE: 'drivers_license',
  VOIDED_CHECK: 'voided_check',
  TAX_RETURN: 'tax_return',
  BUSINESS_FORMATION: 'business_formation',
  OTHER: 'other',
};

export const DOCUMENT_TYPE_LABELS = {
  bank_statement: 'Bank Statement',
  drivers_license: "Driver's License",
  voided_check: 'Voided Check',
  tax_return: 'Tax Return',
  business_formation: 'Business Formation Doc',
  other: 'Other',
};

export const PAYMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CLEARED: 'cleared',
  BOUNCED: 'bounced',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1,
};

export const API_TIMEOUT = 30000; // 30 seconds

export const TOAST_DURATION = 3000; // 3 seconds

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
};

export const INDUSTRIES = [
  'Retail',
  'Food & Beverage',
  'Healthcare',
  'Professional Services',
  'Manufacturing',
  'Construction',
  'Transportation',
  'Technology',
  'Real Estate',
  'Hospitality',
  'Education',
  'Finance',
  'Insurance',
  'Automotive',
  'Other',
];
