const { resolvePayoutPercents } = require('./commissionResolver');

function calculateCommission(input) {
  // Validate required fields
  if (!input.funding || input.funding <= 0) throw new Error('Funding amount is required');
  if (!input.dealType) throw new Error('Deal type is required');

  // Calculate commissionable revenue
  const lenderGross = Math.max(0, input.funding * (input.sellRate - input.buyRate));
  const pointsRevenue = Math.max(0, input.funding * ((input.points || 0) / 100));
  const calculatedTotalRev = lenderGross + pointsRevenue;
  const commissionableRevenue = (input.totalRev && input.totalRev > 0) ? input.totalRev : calculatedTotalRev;

  // Economics
  const buyPayback = input.funding * input.buyRate;
  const sellPayback = input.funding * input.sellRate;
  const estimatedPaymentCheck = input.term > 0 ? input.payback / input.term : 0;

  // Resolve payout percentages
  const payout = resolvePayoutPercents(input);

  // Calculate dollar payouts per role
  const payouts = {};
  let totalPayoutPercent = 0;
  let totalPayoutDollars = 0;

  Object.entries(payout).forEach(([role, percent]) => {
    const dollars = Math.round(commissionableRevenue * percent * 100) / 100;
    payouts[role] = { percent, dollars };
    totalPayoutPercent += percent;
    totalPayoutDollars += dollars;
  });

  // Build matched rule key for debugging
  const ruleKey = [
    input.dealType,
    input.sameRep ? 'same_rep' : 'split',
    input.packageType || 'none',
    input.marketingAssist ? 'ma' : 'no_ma',
    input.leadSubType || input.leadSource || 'unknown',
  ].join('_');

  return {
    // Input echo
    funding: input.funding,
    payback: input.payback,
    payment: input.payment,
    term: input.term,
    buyRate: input.buyRate,
    sellRate: input.sellRate,
    points: input.points || 0,

    // Economics
    buyPayback: Math.round(buyPayback * 100) / 100,
    sellPayback: Math.round(sellPayback * 100) / 100,
    lenderGross: Math.round(lenderGross * 100) / 100,
    pointsRevenue: Math.round(pointsRevenue * 100) / 100,
    calculatedTotalRev: Math.round(calculatedTotalRev * 100) / 100,
    commissionableRevenue: Math.round(commissionableRevenue * 100) / 100,
    estimatedPaymentCheck: Math.round(estimatedPaymentCheck * 100) / 100,

    // Payouts
    payoutPercentages: payout,
    payouts,
    totalPayoutPercent: Math.round(totalPayoutPercent * 1000) / 10,
    totalPayoutDollars: Math.round(totalPayoutDollars * 100) / 100,

    // Meta
    matchedRuleKey: ruleKey,
  };
}

module.exports = { calculateCommission };
