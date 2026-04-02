// ─── COMMISSION RULES CONFIG ──────────────────────────────────────────────────
// All payout percentages are centralized here.
// Non-engineers: edit the numbers below to adjust commission rates.
// Format: decimal (0.40 = 40%, 0.175 = 17.5%)

const COMMISSION_RULES = {
  // 1) New Units — No Marketing Assist
  new_units: {
    no_marketing_same_rep: 0.40,
    no_marketing_split: { puller: 0.20, closer: 0.20 },
  },

  // 3) Renewals — No Marketing Assist
  renewals: {
    no_marketing: 0.40,
  },

  // 4) Marketing Assisted — Same Rep
  marketing_assist_same_rep: {
    marketing_assist: 0.35,
    marketing_assist_half_package: 0.30,
    marketing_assist_full_package: 0.25,
    marketing_assist_renewal: 0.35,

    organic: 0.35,
    organic_half_package: 0.30,
    organic_full_package: 0.25,
    organic_renewal: 0.35,

    facebook_funnel: 0.40,
    facebook_funnel_renewal: 0.40,

    mailer: 0.35,
    mailer_half_package: 0.25,
    mailer_full_package: 0.20,
    mailer_renewal: 0.35,

    sms_magic: 0.25,
    sms_magic_renewal: 0.25,
  },

  // 5-7) Marketing Assisted — Split (Different Reps)
  marketing_assist_split: {
    standard: { puller: 0.175, closer: 0.175 },
    half_package: { puller: 0.15, closer: 0.15 },
    full_package: { puller: 0.125, closer: 0.125 },
  },

  // 8) Organic — Split
  organic_split: {
    standard: { puller: 0.175, closer: 0.175 },
  },

  // 9-11) Mailer — Split
  mailer_split: {
    standard: { puller: 0.175, closer: 0.175 },
    half_package: { puller: 0.125, closer: 0.125 },
    full_package: { puller: 0.10, closer: 0.10 },
  },

  // 12) Deal Lost
  deal_lost: {
    closer_alone: 0.40,
    closer_original_puller_paid: 0.30,
    closer_original_and_repuller_paid: 0.20,
    original_puller: 0.10,
    re_puller: 0.10,
  },

  // 13) Paid Off Renewals
  paid_off_renewals: {
    new_closer_split_within_90_days: 0.40,
    new_closer_uncalled_90_days: 0.40,
  },

  // 14) Referrals
  referrals: {
    employee: 0.70,
    crm: 0.60,
    referral: 0.50,
    employee_renewal: 0.70,
    crm_renewal: 0.60,
    referral_renewal: 0.50,
    rusty: 0.30,
    rusty_renewal: 0.35,
  },

  // 15) SBA and Real Estate
  sba_real_estate: {
    same_rep: 0.50,
    split: { puller: 0.20, closer: 0.30 },
    half_package: 0.30,
    full_package: 0.25,
  },

  // 16) Other
  other: {
    house_pulled: 0.25,
    ferrari_porsche: 0.35,
    ferrari_porsche_renewal: 0.40,
    ferrari_porsche_renewal_marketing: 0.35,
    new_rep_handoff_base: 0.10,
    new_rep_self_funded_base: 0.15,
  },
};

module.exports = COMMISSION_RULES;
