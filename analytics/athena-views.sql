-- ============================================================
-- Capital Infusion Analytics - Athena Views
-- Run these in Athena against capital_infusion_analytics DB
-- ============================================================

-- ── View 1: Rep Production Summary ───────────────────────────────────────────
CREATE OR REPLACE VIEW rep_production_summary AS
SELECT
  rep_id,
  rep_name,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN status IN ('submitted','approved','funded') THEN 1 END) AS submitted,
  COUNT(CASE WHEN status IN ('approved','funded') THEN 1 END) AS approved,
  COUNT(CASE WHEN status = 'funded' THEN 1 END) AS funded,
  SUM(CASE WHEN status = 'funded' THEN funded_amount ELSE 0 END) AS total_funded_amount,
  AVG(CASE WHEN status = 'funded' THEN funded_amount END) AS avg_deal_size,
  ROUND(
    COUNT(CASE WHEN status IN ('approved','funded') THEN 1 END) * 100.0 /
    NULLIF(COUNT(CASE WHEN status IN ('submitted','approved','funded') THEN 1 END), 0), 2
  ) AS approval_rate_pct,
  ROUND(
    COUNT(CASE WHEN status = 'funded' THEN 1 END) * 100.0 /
    NULLIF(COUNT(CASE WHEN status IN ('submitted','approved','funded') THEN 1 END), 0), 2
  ) AS funding_rate_pct,
  AVG(
    CASE WHEN funded_date IS NOT NULL AND submitted_date IS NOT NULL
    THEN date_diff('day', date_parse(submitted_date,'%Y-%m-%d'), date_parse(funded_date,'%Y-%m-%d'))
    END
  ) AS avg_days_to_fund
FROM deals
GROUP BY rep_id, rep_name;

-- ── View 2: Monthly Production Trends ────────────────────────────────────────
CREATE OR REPLACE VIEW monthly_production AS
SELECT
  rep_id,
  rep_name,
  year,
  month,
  COUNT(*) AS deals_submitted,
  COUNT(CASE WHEN status IN ('approved','funded') THEN 1 END) AS deals_approved,
  COUNT(CASE WHEN status = 'funded' THEN 1 END) AS deals_funded,
  SUM(CASE WHEN status = 'funded' THEN funded_amount ELSE 0 END) AS funded_volume,
  AVG(CASE WHEN status = 'funded' THEN funded_amount END) AS avg_funded_amount
FROM deals
GROUP BY rep_id, rep_name, year, month
ORDER BY year DESC, month DESC;

-- ── View 3: Lender Performance by Rep ────────────────────────────────────────
CREATE OR REPLACE VIEW lender_performance_by_rep AS
SELECT
  lo.rep_id,
  lo.lender_name,
  COUNT(*) AS total_submissions,
  COUNT(CASE WHEN lo.decision = 'approved' THEN 1 END) AS approvals,
  COUNT(CASE WHEN lo.decision = 'declined' THEN 1 END) AS declines,
  COUNT(CASE WHEN lo.decision = 'funded' THEN 1 END) AS funded,
  SUM(CASE WHEN lo.decision = 'funded' THEN lo.funded_amount ELSE 0 END) AS total_funded,
  AVG(CASE WHEN lo.decision = 'funded' THEN lo.funded_amount END) AS avg_funded_amount,
  AVG(CASE WHEN lo.decision = 'funded' THEN lo.factor_rate END) AS avg_factor_rate,
  ROUND(
    COUNT(CASE WHEN lo.decision IN ('approved','funded') THEN 1 END) * 100.0 /
    NULLIF(COUNT(*), 0), 2
  ) AS approval_rate_pct,
  AVG(lo.days_to_decision) AS avg_days_to_decision
FROM lender_outcomes lo
GROUP BY lo.rep_id, lo.lender_name;

-- ── View 4: Company-Wide Lender Leaderboard (Admin) ──────────────────────────
CREATE OR REPLACE VIEW lender_leaderboard AS
SELECT
  lender_name,
  COUNT(*) AS total_submissions,
  COUNT(CASE WHEN decision IN ('approved','funded') THEN 1 END) AS approvals,
  COUNT(CASE WHEN decision = 'funded' THEN 1 END) AS funded_deals,
  SUM(CASE WHEN decision = 'funded' THEN funded_amount ELSE 0 END) AS total_funded_volume,
  AVG(CASE WHEN decision = 'funded' THEN funded_amount END) AS avg_deal_size,
  ROUND(
    COUNT(CASE WHEN decision IN ('approved','funded') THEN 1 END) * 100.0 /
    NULLIF(COUNT(*), 0), 2
  ) AS approval_rate_pct,
  AVG(days_to_decision) AS avg_days_to_decision,
  COUNT(DISTINCT rep_id) AS reps_using
FROM lender_outcomes
GROUP BY lender_name
ORDER BY total_funded_volume DESC;

-- ── View 5: Pipeline by Stage ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW pipeline_by_stage AS
SELECT
  rep_id,
  rep_name,
  stage,
  status,
  COUNT(*) AS deal_count,
  SUM(requested_amount) AS total_requested,
  AVG(requested_amount) AS avg_requested,
  AVG(
    date_diff('day', date_parse(created_at,'%Y-%m-%dT%H:%i:%sZ'), current_date)
  ) AS avg_age_days
FROM deals
WHERE status NOT IN ('funded','declined','withdrawn')
GROUP BY rep_id, rep_name, stage, status;

-- ── View 6: Underwriting Summary by Rep ──────────────────────────────────────
CREATE OR REPLACE VIEW underwriting_summary AS
SELECT
  u.rep_id,
  COUNT(*) AS analyses_run,
  AVG(u.avg_monthly_revenue) AS avg_monthly_revenue,
  AVG(u.avg_monthly_deposits) AS avg_monthly_deposits,
  AVG(u.negative_days) AS avg_negative_days,
  AVG(u.avg_daily_balance) AS avg_daily_balance,
  AVG(u.months_covered) AS avg_months_covered,
  PERCENTILE_APPROX(u.avg_monthly_revenue, 0.5) AS median_monthly_revenue
FROM underwriting_metrics u
GROUP BY u.rep_id;

-- ── View 7: Debt Burden Summary ───────────────────────────────────────────────
CREATE OR REPLACE VIEW debt_burden_summary AS
SELECT
  rep_id,
  COUNT(DISTINCT client_id) AS clients_with_debt,
  SUM(outstanding_balance) AS total_outstanding,
  SUM(monthly_payment) AS total_monthly_obligations,
  AVG(factor_rate) AS avg_factor_rate,
  AVG(outstanding_balance) AS avg_balance_per_client,
  COUNT(CASE WHEN position = '1st' THEN 1 END) AS first_position_count,
  COUNT(CASE WHEN position = '2nd' THEN 1 END) AS second_position_count,
  COUNT(CASE WHEN position = '3rd' THEN 1 END) AS third_position_count
FROM debt_schedules
GROUP BY rep_id;

-- ── View 8: Document Activity by Rep ─────────────────────────────────────────
CREATE OR REPLACE VIEW document_activity AS
SELECT
  rep_id,
  COUNT(*) AS total_uploads,
  COUNT(DISTINCT client_id) AS clients_with_uploads,
  COUNT(CASE WHEN status = 'Approved' THEN 1 END) AS approved_docs,
  COUNT(CASE WHEN status = 'Under Review' THEN 1 END) AS pending_review,
  COUNT(CASE WHEN status = 'Needs Reupload' THEN 1 END) AS needs_reupload,
  AVG(file_size_mb) AS avg_file_size_mb,
  COUNT(CASE WHEN category = 'bank_statements' THEN 1 END) AS bank_statements,
  COUNT(CASE WHEN category = 'application' THEN 1 END) AS applications,
  COUNT(CASE WHEN category = 'drivers_license' THEN 1 END) AS id_docs
FROM document_uploads
GROUP BY rep_id;
