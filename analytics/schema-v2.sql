-- ============================================================
-- Capital Infusion Analytics Schema v2
-- Athena/Glue compatible — partitioned by year/month
-- ============================================================

-- A) MANUALLY INPUTTED — reps enter this via Deal Log
CREATE EXTERNAL TABLE IF NOT EXISTS deals_table (
  deal_id         STRING,
  rep_id          STRING,
  rep_name        STRING,
  client_id       STRING,
  client_name     STRING,
  lender_name     STRING,
  funded_amount   DOUBLE,
  requested_amount DOUBLE,
  approved_amount DOUBLE,
  factor_rate     DOUBLE,
  payback_amount  DOUBLE,
  approval_status STRING,   -- submitted|approved|funded|declined|withdrawn
  stage           STRING,
  position        STRING,   -- 1st|2nd|3rd
  source          STRING,   -- direct|referral|broker|docusign
  industry        STRING,
  state           STRING,
  -- Stage timestamps (manually updated by rep)
  application_submitted_at  STRING,
  docs_uploaded_at          STRING,
  underwritten_at           STRING,
  approved_at               STRING,
  funded_at                 STRING,
  -- Calculated durations (seconds)
  days_submit_to_docs       INT,
  days_docs_to_underwrite   INT,
  days_underwrite_to_approve INT,
  days_approve_to_fund      INT,
  days_total_to_fund        INT,
  created_at      STRING
)
PARTITIONED BY (year STRING, month STRING)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://orbit-documents-882611632216-882611632216-us-east-1-an/analytics/deals/';

-- B) AUTO-INGESTED — extracted from bank statements via Textract
CREATE EXTERNAL TABLE IF NOT EXISTS underwriting_metrics_table (
  metric_id             STRING,
  deal_id               STRING,
  client_id             STRING,
  rep_id                STRING,
  -- Auto-extracted from bank statements
  avg_monthly_revenue   DOUBLE,
  avg_monthly_deposits  DOUBLE,
  true_revenue          DOUBLE,   -- deposits minus detected MCA payments
  nsf_count             INT,
  negative_days         INT,
  avg_daily_balance     DOUBLE,
  deposit_count         INT,
  mca_deposits_detected DOUBLE,   -- identified MCA inflows excluded from true revenue
  statement_start_date  STRING,
  statement_end_date    STRING,
  months_covered        INT,
  -- Source
  extracted_by          STRING,   -- textract|manual
  analyzed_at           STRING
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://orbit-documents-882611632216-882611632216-us-east-1-an/analytics/underwriting_metrics/';

-- C) MANUALLY INPUTTED — debt/obligation data
CREATE EXTERNAL TABLE IF NOT EXISTS debt_metrics_table (
  debt_id                     STRING,
  deal_id                     STRING,
  client_id                   STRING,
  rep_id                      STRING,
  lender_name                 STRING,
  -- Manual entry
  total_existing_mca_balance  DOUBLE,
  daily_payment_obligation    DOUBLE,
  monthly_payment_obligation  DOUBLE,
  withholding_percentage      DOUBLE,
  position                    STRING,
  payoff_date                 STRING,
  -- Calculated
  debt_burden_ratio           DOUBLE,   -- total_balance / avg_monthly_revenue
  created_at                  STRING
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://orbit-documents-882611632216-882611632216-us-east-1-an/analytics/debt_schedules/';

-- ── Athena Views ──────────────────────────────────────────────────────────────

-- App to Approval Metrics
CREATE OR REPLACE VIEW app_approval_metrics AS
SELECT
  rep_id, rep_name,
  COUNT(*) AS total_apps,
  COUNT(CASE WHEN approval_status IN ('approved','funded') THEN 1 END) AS approved_count,
  COUNT(CASE WHEN approval_status = 'funded' THEN 1 END) AS funded_count,
  ROUND(COUNT(CASE WHEN approval_status IN ('approved','funded') THEN 1 END) * 100.0 / NULLIF(COUNT(*),0), 2) AS app_to_approval_ratio,
  ROUND(COUNT(CASE WHEN approval_status = 'funded' THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN approval_status IN ('approved','funded') THEN 1 END),0), 2) AS approval_to_funding_ratio,
  SUM(CASE WHEN approval_status = 'funded' THEN funded_amount ELSE 0 END) AS total_funded_volume,
  AVG(CASE WHEN approval_status = 'funded' THEN funded_amount END) AS avg_deal_size,
  AVG(CASE WHEN days_total_to_fund > 0 THEN days_total_to_fund END) AS avg_days_to_fund
FROM deals_table
GROUP BY rep_id, rep_name;

-- Stage Duration Metrics
CREATE OR REPLACE VIEW stage_duration_metrics AS
SELECT
  rep_id,
  AVG(days_submit_to_docs) AS avg_days_submit_to_docs,
  AVG(days_docs_to_underwrite) AS avg_days_docs_to_underwrite,
  AVG(days_underwrite_to_approve) AS avg_days_underwrite_to_approve,
  AVG(days_approve_to_fund) AS avg_days_approve_to_fund,
  AVG(days_total_to_fund) AS avg_days_total_to_fund,
  MIN(days_total_to_fund) AS min_days_to_fund,
  MAX(days_total_to_fund) AS max_days_to_fund
FROM deals_table
WHERE approval_status = 'funded'
GROUP BY rep_id;

-- Lender Distribution
CREATE OR REPLACE VIEW lender_distribution AS
SELECT
  lender_name,
  rep_id,
  COUNT(*) AS submissions,
  COUNT(CASE WHEN approval_status = 'funded' THEN 1 END) AS funded,
  SUM(CASE WHEN approval_status = 'funded' THEN funded_amount ELSE 0 END) AS volume,
  ROUND(COUNT(CASE WHEN approval_status = 'funded' THEN 1 END) * 100.0 / NULLIF(COUNT(*),0), 2) AS funding_rate
FROM deals_table
GROUP BY lender_name, rep_id;

-- Revenue & Risk Metrics
CREATE OR REPLACE VIEW revenue_risk_metrics AS
SELECT
  u.rep_id,
  AVG(u.avg_monthly_revenue) AS avg_monthly_revenue,
  AVG(u.true_revenue) AS avg_true_revenue,
  AVG(u.nsf_count) AS avg_nsf_count,
  AVG(u.negative_days) AS avg_negative_days,
  AVG(u.avg_daily_balance) AS avg_daily_balance,
  AVG(d.withholding_percentage) AS avg_withholding_pct,
  AVG(d.daily_payment_obligation) AS avg_daily_obligation,
  AVG(d.debt_burden_ratio) AS avg_debt_burden_ratio
FROM underwriting_metrics_table u
LEFT JOIN debt_metrics_table d ON u.deal_id = d.deal_id
GROUP BY u.rep_id;
