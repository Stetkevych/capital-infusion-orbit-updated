const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsImVtYWlsIjoiYWxleHNAY2FwaXRhbC1pbmZ1c2lvbi5jb20iLCJyb2xlIjoiYWRtaW4iLCJmdWxsX25hbWUiOiJBbGV4IFN0ZXRrZXZ5Y2giLCJyZXBfaWQiOm51bGwsImNsaWVudF9pZCI6bnVsbCwiaWF0IjoxNzc4NTM2MzcxLCJleHAiOjE3Nzg2MjI3NzF9.c3CkPfXrsZZielQF3tiUrbXxwPsSJPVaLc-gXDJkr24';
const API = 'https://api.orbit-technology.com/api';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const INDUSTRIES = ['construction', 'medical', 'plumbing', 'hvac', 'dental', 'veterinary', 'roofing', 'electrical'];
const STATES = ['Florida', 'New York', 'California', 'Texas'];
const EMP_RANGES = ['11,50'];
const TITLES = ['Owner', 'Founder', 'Co-Founder'];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchAndSave() {
  const allLeads = [];
  const seen = new Set();
  let total = 0;

  for (const industry of INDUSTRIES) {
    for (const state of STATES) {
      console.log(`Searching: ${industry} × ${state}...`);
      try {
        const res = await fetch(`${API}/apollo/search`, {
          method: 'POST', headers,
          body: JSON.stringify({
            page: 1, per_page: 100,
            person_titles: TITLES,
            person_locations: [state],
            organization_num_employees_ranges: EMP_RANGES,
            q_keywords: industry,
            person_seniorities: ['owner', 'founder', 'c_suite'],
          })
        });
        if (!res.ok) { console.log(`  FAILED: ${res.status}`); await sleep(2000); continue; }
        const data = await res.json();
        const people = data.people || [];
        let added = 0;
        for (const p of people) {
          const key = p.id || `${p.first_name}${p.last_name}${p.organization?.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allLeads.push({
            id: p.id,
            contact_name: `${p.first_name || ''} ${p.last_name || p.last_name_obfuscated || ''}`.trim(),
            title: p.title || '',
            company_name: p.organization?.name || '',
            website: p.organization?.website_url || '',
            industry: p.organization?.industry || industry,
            location: [p.city, p.state, p.country].filter(Boolean).join(', '),
            employee_count: p.organization?.estimated_num_employees || '',
            email: p.email || '',
            email_status: p.email_status || (p.has_email ? 'available' : 'unavailable'),
            has_email: !!p.email || p.has_email === true,
            phone: p.phone_numbers?.[0]?.sanitized_number || '',
            linkedin_url: p.linkedin_url || '',
            source: 'Apollo',
            search_industry: industry,
            search_state: state,
            saved_at: new Date().toISOString(),
          });
          added++;
        }
        total += added;
        console.log(`  Found ${people.length}, added ${added} unique (total: ${total})`);
      } catch (e) { console.log(`  ERROR: ${e.message}`); }
      await sleep(1500); // rate limit
    }
  }

  console.log(`\nTotal unique leads: ${allLeads.length}`);
  console.log('Saving to server...');

  // Save in batches of 50
  for (let i = 0; i < allLeads.length; i += 50) {
    const batch = allLeads.slice(i, i + 50);
    for (const lead of batch) {
      try {
        await fetch(`${API}/apollo/enriched-leads`, {
          method: 'POST', headers, body: JSON.stringify(lead)
        });
      } catch {}
    }
    console.log(`  Saved ${Math.min(i + 50, allLeads.length)}/${allLeads.length}`);
    await sleep(500);
  }

  console.log('Done!');
}

searchAndSave();
