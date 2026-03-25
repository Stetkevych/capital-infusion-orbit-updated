-- MCA Lending Platform - PostgreSQL Schema
-- Run this after creating the database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales_rep', 'client')),
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Merchants (clients) table
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name VARCHAR(255) NOT NULL,
  dba_name VARCHAR(255),
  ein VARCHAR(20) UNIQUE,
  owner_name VARCHAR(255),
  owner_email VARCHAR(255),
  owner_phone VARCHAR(20),
  business_address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  country VARCHAR(100) DEFAULT 'USA',
  industry VARCHAR(100),
  annual_revenue DECIMAL(15, 2),
  monthly_revenue DECIMAL(15, 2),
  years_in_business INTEGER,
  bank_connected BOOLEAN DEFAULT false,
  plaid_access_token TEXT,
  plaid_item_id VARCHAR(255),
  plaid_accounts JSONB DEFAULT '{}'::jsonb,
  assigned_rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
  credit_score INTEGER,
  business_credit_score INTEGER,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_merchants_ein ON merchants(ein);
CREATE INDEX idx_merchants_owner_email ON merchants(owner_email);
CREATE INDEX idx_merchants_assigned_rep ON merchants(assigned_rep_id);
CREATE INDEX idx_merchants_status ON merchants(status);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_name VARCHAR(255) NOT NULL,
  merchant_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'inquiry' CHECK (
    status IN ('inquiry', 'submitted', 'underwriting', 'approved', 'funded', 'declined', 'withdrawn')
  ),
  application_type VARCHAR(50) DEFAULT 'mca',
  amount_requested DECIMAL(15, 2),
  business_revenue DECIMAL(15, 2),
  industry VARCHAR(100),
  years_in_business INTEGER,
  assigned_rep_id UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_date TIMESTAMP,
  completed_date TIMESTAMP,
  declined_reason VARCHAR(500),
  notes TEXT,
  underwriting_notes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_applications_merchant ON applications(merchant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_assigned_rep ON applications(assigned_rep_id);
CREATE INDEX idx_applications_submitted ON applications(submitted_date);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_name VARCHAR(255) NOT NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  funder_name VARCHAR(255),
  funding_amount DECIMAL(15, 2),
  purchased_amount DECIMAL(15, 2),
  factor_rate DECIMAL(5, 4),
  payback_amount DECIMAL(15, 2),
  term_length INTEGER,
  daily_payment DECIMAL(10, 2),
  weekly_payment DECIMAL(10, 2),
  holdback_percent DECIMAL(5, 2),
  funded_date TIMESTAMP,
  maturity_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted', 'pending')),
  position VARCHAR(10) CHECK (position IN ('1st', '2nd', '3rd')),
  current_balance DECIMAL(15, 2),
  total_collected DECIMAL(15, 2) DEFAULT 0,
  collection_rate DECIMAL(5, 2),
  payments_made INTEGER DEFAULT 0,
  payments_remaining INTEGER,
  last_payment_date TIMESTAMP,
  nsf_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deals_merchant ON deals(merchant_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_funded_date ON deals(funded_date);
CREATE INDEX idx_deals_maturity ON deals(maturity_date);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(500) NOT NULL,
  file_url VARCHAR(1000),
  file_size BIGINT,
  document_type VARCHAR(100) CHECK (
    document_type IN ('bank_statement', 'drivers_license', 'voided_check', 'tax_return', 'business_formation', 'other')
  ),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_name VARCHAR(255),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected')),
  classification_confidence DECIMAL(3, 2),
  au_gold_status VARCHAR(50) DEFAULT 'pending' CHECK (au_gold_status IN ('pending', 'processing', 'completed', 'failed')),
  au_gold_results JSONB DEFAULT '{}'::jsonb,
  au_gold_score DECIMAL(5, 2),
  au_gold_recommendation VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_merchant ON documents(merchant_id);
CREATE INDEX idx_documents_application ON documents(application_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_au_status ON documents(au_gold_status);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id),
  merchant_name VARCHAR(255),
  payment_date TIMESTAMP NOT NULL,
  scheduled_amount DECIMAL(15, 2),
  actual_amount DECIMAL(15, 2),
  payment_type VARCHAR(50) CHECK (payment_type IN ('ach', 'debit', 'manual', 'other')),
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cleared', 'bounced', 'failed', 'cancelled')),
  cleared_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_deal ON payments(deal_id);
CREATE INDEX idx_payments_merchant ON payments(merchant_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_status ON payments(status);

-- Notes/Comments table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  client_visible BOOLEAN DEFAULT false,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_merchant ON notes(merchant_id);
CREATE INDEX idx_notes_deal ON notes(deal_id);
CREATE INDEX idx_notes_application ON notes(application_id);
CREATE INDEX idx_notes_visibility ON notes(client_visible);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_name VARCHAR(255) NOT NULL,
  fund VARCHAR(100),
  buy_rate DECIMAL(5, 4),
  term INTEGER,
  daily_rate DECIMAL(5, 4),
  min_revenue DECIMAL(15, 2),
  max_revenue DECIMAL(15, 2),
  min_time_in_business INTEGER,
  max_time_in_business INTEGER,
  eligible_industries TEXT[] DEFAULT '{}',
  exclude_industries TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  lender_name VARCHAR(255),
  offer_type VARCHAR(100),
  funding_speed VARCHAR(50),
  priority_rank INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_offers_active ON offers(active);
CREATE INDEX idx_offers_priority ON offers(priority_rank);

-- Funders table
CREATE TABLE IF NOT EXISTS funders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  website VARCHAR(500),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ISOs (Independent Sales Organizations) table
CREATE TABLE IF NOT EXISTS isos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) UNIQUE NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  commission_percent DECIMAL(5, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  related_merchant_id UUID REFERENCES merchants(id),
  related_deal_id UUID REFERENCES deals(id),
  related_application_id UUID REFERENCES applications(id),
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Upload Logs table
CREATE TABLE IF NOT EXISTS upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  merchant_id UUID REFERENCES merchants(id),
  document_id UUID REFERENCES documents(id),
  file_name VARCHAR(500),
  file_size BIGINT,
  status VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_logs_user ON upload_logs(user_id);
CREATE INDEX idx_upload_logs_merchant ON upload_logs(merchant_id);

-- System Metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(255) NOT NULL,
  metric_value DECIMAL(15, 2),
  tags JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);

-- Merchant Health Score table
CREATE TABLE IF NOT EXISTS merchant_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID UNIQUE NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  overall_score DECIMAL(5, 2),
  payment_health DECIMAL(5, 2),
  revenue_health DECIMAL(5, 2),
  credit_health DECIMAL(5, 2),
  bank_activity_health DECIMAL(5, 2),
  risk_level VARCHAR(50),
  last_assessed TIMESTAMP,
  assessment_notes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deal Alerts table
CREATE TABLE IF NOT EXISTS deal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deal_alerts_deal ON deal_alerts(deal_id);
CREATE INDEX idx_deal_alerts_severity ON deal_alerts(severity);

-- Portfolio Metrics table
CREATE TABLE IF NOT EXISTS portfolio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_deployed DECIMAL(15, 2),
  total_active DECIMAL(15, 2),
  total_collected DECIMAL(15, 2),
  default_count INTEGER,
  default_amount DECIMAL(15, 2),
  avg_factor_rate DECIMAL(5, 4),
  portfolio_roi DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portfolio_metrics_date ON portfolio_metrics(metric_date);

-- DocuSign Integration table
CREATE TABLE IF NOT EXISTS docusign_envelopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id VARCHAR(255) UNIQUE NOT NULL,
  merchant_id UUID REFERENCES merchants(id),
  deal_id UUID REFERENCES deals(id),
  application_id UUID REFERENCES applications(id),
  document_name VARCHAR(500),
  status VARCHAR(50),
  sent_date TIMESTAMP,
  completed_date TIMESTAMP,
  webhook_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_docusign_envelopes_status ON docusign_envelopes(status);
CREATE INDEX idx_docusign_envelopes_merchant ON docusign_envelopes(merchant_id);

-- Zoho CRM Sync Logs table
CREATE TABLE IF NOT EXISTS zoho_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(100),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  zoho_id VARCHAR(255),
  status VARCHAR(50),
  error_message TEXT,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zoho_sync_resource ON zoho_sync_logs(resource_type, resource_id);
CREATE INDEX idx_zoho_sync_last ON zoho_sync_logs(last_sync);

-- Bank Connection Status table
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID UNIQUE NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plaid_item_id VARCHAR(255),
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_mask VARCHAR(10),
  account_subtype VARCHAR(100),
  last_transaction_date TIMESTAMP,
  connection_status VARCHAR(50) DEFAULT 'connected',
  error_message TEXT,
  connected_at TIMESTAMP,
  disconnected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_connections_merchant ON bank_connections(merchant_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(connection_status);
