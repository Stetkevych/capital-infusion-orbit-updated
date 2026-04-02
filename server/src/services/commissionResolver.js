const RULES = require('./commissionRules');

function resolvePayoutPercents(input) {
  const pkg = input.packageType || 'none';
  const lead = (input.leadSubType || input.leadSource || '').toLowerCase();
  const isRenewal = input.dealType?.includes('renewal') || lead.includes('renewal');

  // ─── 15) SBA / Real Estate ────────────────────────────────────────────────
  if (input.dealType === 'sba_real_estate') {
    if (input.sameRep) return { same_rep: RULES.sba_real_estate.same_rep };
    if (pkg === 'half') return { split: RULES.sba_real_estate.half_package };
    if (pkg === 'full') return { split: RULES.sba_real_estate.full_package };
    return RULES.sba_real_estate.split;
  }

  // ─── 14) Referrals ────────────────────────────────────────────────────────
  if (input.dealType === 'referral') {
    const ref = (input.referralType || '').toLowerCase();
    if (ref.includes('employee')) return { same_rep: isRenewal ? RULES.referrals.employee_renewal : RULES.referrals.employee };
    if (ref.includes('crm')) return { same_rep: isRenewal ? RULES.referrals.crm_renewal : RULES.referrals.crm };
    if (ref.includes('rusty')) return { same_rep: isRenewal ? RULES.referrals.rusty_renewal : RULES.referrals.rusty };
    return { same_rep: isRenewal ? RULES.referrals.referral_renewal : RULES.referrals.referral };
  }

  // ─── 12) Deal Lost ────────────────────────────────────────────────────────
  if (input.dealType === 'deal_lost') {
    if (input.hasRePuller) {
      return {
        closer: RULES.deal_lost.closer_original_and_repuller_paid,
        original_puller: RULES.deal_lost.original_puller,
        re_puller: RULES.deal_lost.re_puller,
      };
    }
    if (input.originalPullerPaid) {
      return {
        closer: RULES.deal_lost.closer_original_puller_paid,
        original_puller: RULES.deal_lost.original_puller,
      };
    }
    return { closer: RULES.deal_lost.closer_alone };
  }

  // ─── 13) Paid Off Renewals ────────────────────────────────────────────────
  if (input.dealType === 'paid_off_renewal') {
    if ((input.daysSincePaidOff || 0) <= 90 && input.splitWithOriginalCloser) {
      return { new_closer: RULES.paid_off_renewals.new_closer_split_within_90_days };
    }
    return { new_closer: RULES.paid_off_renewals.new_closer_uncalled_90_days };
  }

  // ─── 16) Other ────────────────────────────────────────────────────────────
  if (input.dealType === 'other') {
    if (lead.includes('house')) return { same_rep: RULES.other.house_pulled };
    if (lead.includes('ferrari') || lead.includes('porsche')) {
      if (isRenewal && input.marketingAssist) return { same_rep: RULES.other.ferrari_porsche_renewal_marketing };
      if (isRenewal) return { same_rep: RULES.other.ferrari_porsche_renewal };
      return input.sameRep ? { same_rep: RULES.other.ferrari_porsche } : { puller: RULES.other.ferrari_porsche / 2, closer: RULES.other.ferrari_porsche / 2 };
    }
    if (lead.includes('handoff')) return { same_rep: RULES.other.new_rep_handoff_base };
    if (lead.includes('self funded') || lead.includes('self_funded')) return { same_rep: RULES.other.new_rep_self_funded_base };
  }

  // ─── 1) New Units — No Marketing Assist ───────────────────────────────────
  if (input.dealType === 'new_unit' && !input.marketingAssist) {
    return input.sameRep
      ? { same_rep: RULES.new_units.no_marketing_same_rep }
      : RULES.new_units.no_marketing_split;
  }

  // ─── 3) Renewals — No Marketing Assist ────────────────────────────────────
  if (input.dealType === 'renewal' && !input.marketingAssist) {
    return { same_rep: RULES.renewals.no_marketing };
  }

  // ─── 4-11) Marketing Assisted / Organic / Mailer / Facebook / SMS ─────────
  const isMA = input.marketingAssist || input.dealType === 'marketing_assist';

  if (isMA || input.dealType === 'renewal' || input.dealType === 'new_unit') {
    // ── Same rep ──
    if (input.sameRep) {
      // SMS Magic
      if (lead.includes('sms')) return { same_rep: isRenewal ? RULES.marketing_assist_same_rep.sms_magic_renewal : RULES.marketing_assist_same_rep.sms_magic };

      // Facebook / Funnel
      if (lead.includes('facebook') || lead.includes('funnel')) return { same_rep: isRenewal ? RULES.marketing_assist_same_rep.facebook_funnel_renewal : RULES.marketing_assist_same_rep.facebook_funnel };

      // Mailer
      if (lead.includes('mailer')) {
        if (isRenewal) return { same_rep: RULES.marketing_assist_same_rep.mailer_renewal };
        if (pkg === 'half') return { same_rep: RULES.marketing_assist_same_rep.mailer_half_package };
        if (pkg === 'full') return { same_rep: RULES.marketing_assist_same_rep.mailer_full_package };
        return { same_rep: RULES.marketing_assist_same_rep.mailer };
      }

      // Organic
      if (lead.includes('organic') || lead.includes('apple') || lead.includes('t&e') || lead.includes('website') || lead.includes('avocado') || lead.includes('b-loans') || lead.includes('t-loans') || lead.includes('fc leaf') || lead.includes('online app') || input.renewalOriginallyOrganic) {
        if (isRenewal || input.renewalOriginallyOrganic) return { same_rep: RULES.marketing_assist_same_rep.organic_renewal };
        if (pkg === 'half') return { same_rep: RULES.marketing_assist_same_rep.organic_half_package };
        if (pkg === 'full') return { same_rep: RULES.marketing_assist_same_rep.organic_full_package };
        return { same_rep: RULES.marketing_assist_same_rep.organic };
      }

      // Default marketing assist same rep
      if (isRenewal) return { same_rep: RULES.marketing_assist_same_rep.marketing_assist_renewal };
      if (pkg === 'half') return { same_rep: RULES.marketing_assist_same_rep.marketing_assist_half_package };
      if (pkg === 'full') return { same_rep: RULES.marketing_assist_same_rep.marketing_assist_full_package };
      return { same_rep: RULES.marketing_assist_same_rep.marketing_assist };
    }

    // ── Split (different reps) ──

    // Mailer split
    if (lead.includes('mailer')) {
      if (pkg === 'half') return RULES.mailer_split.half_package;
      if (pkg === 'full') return RULES.mailer_split.full_package;
      return RULES.mailer_split.standard;
    }

    // Organic split
    if (lead.includes('organic') || lead.includes('apple') || lead.includes('t&e') || lead.includes('website') || lead.includes('avocado')) {
      return RULES.organic_split.standard;
    }

    // Default marketing assist split
    if (pkg === 'half') return RULES.marketing_assist_split.half_package;
    if (pkg === 'full') return RULES.marketing_assist_split.full_package;
    return RULES.marketing_assist_split.standard;
  }

  throw new Error('No commission rule matched this deal configuration');
}

module.exports = { resolvePayoutPercents };
