const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const seedData = async () => {
  try {
    console.log('Seeding demo data...');

    // Create users
    const hashedPassword = await bcrypt.hash('password', 10);

    const users = [
      { email: 'admin@demo.com', full_name: 'Admin User', role: 'admin' },
      { email: 'rep@demo.com', full_name: 'John Rep', role: 'sales_rep' },
      { email: 'client@demo.com', full_name: 'Jane Client', role: 'client' },
    ];

    for (const user of users) {
      await query(
        `INSERT INTO users (email, full_name, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (email) DO NOTHING`,
        [user.email, user.full_name, hashedPassword, user.role]
      );
    }
    console.log('✓ Users created');

    // Create demo merchants
    const merchants = [
      {
        legal_name: 'ABC Retail Corp',
        dba_name: 'ABC Store',
        ein: '12-3456789',
        owner_name: 'John Smith',
        owner_email: 'john@abcstore.com',
        owner_phone: '555-0101',
        business_address: '123 Main St, New York, NY 10001',
        industry: 'Retail',
        annual_revenue: 750000,
        years_in_business: 5,
      },
      {
        legal_name: 'XYZ Services LLC',
        dba_name: 'XYZ Cleaning',
        ein: '98-7654321',
        owner_name: 'Maria Garcia',
        owner_email: 'maria@xyzclean.com',
        owner_phone: '555-0102',
        business_address: '456 Oak Ave, Los Angeles, CA 90001',
        industry: 'Services',
        annual_revenue: 500000,
        years_in_business: 3,
      },
    ];

    for (const merchant of merchants) {
      await query(
        `INSERT INTO merchants (
          legal_name, dba_name, ein, owner_name, owner_email, owner_phone,
          business_address, industry, annual_revenue, years_in_business,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (ein) DO NOTHING`,
        [
          merchant.legal_name, merchant.dba_name, merchant.ein, merchant.owner_name,
          merchant.owner_email, merchant.owner_phone, merchant.business_address,
          merchant.industry, merchant.annual_revenue, merchant.years_in_business
        ]
      );
    }
    console.log('✓ Merchants created');

    // Create demo offers
    const offers = [
      {
        offer_name: 'Quick Growth $25K',
        fund: '$25,000',
        buy_rate: 1.4,
        term: 90,
        min_revenue: 250000,
        max_revenue: 1000000,
        lender_name: 'Growth Capital',
      },
      {
        offer_name: 'Expansion Fund $50K',
        fund: '$50,000',
        buy_rate: 1.35,
        term: 120,
        min_revenue: 500000,
        max_revenue: 2000000,
        lender_name: 'Elite Funding',
      },
    ];

    for (const offer of offers) {
      await query(
        `INSERT INTO offers (
          offer_name, fund, buy_rate, term, min_revenue, max_revenue,
          lender_name, active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING`,
        [
          offer.offer_name, offer.fund, offer.buy_rate, offer.term,
          offer.min_revenue, offer.max_revenue, offer.lender_name
        ]
      );
    }
    console.log('✓ Offers created');

    console.log('✓ Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
