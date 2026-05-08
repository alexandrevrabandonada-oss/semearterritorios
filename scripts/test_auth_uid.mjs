import fetch from 'node-fetch';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'gtpitwhslqjgbuwlsaqg';
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function testAuthUid() {
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN is required');
    process.exit(1);
  }

  const sql = `
    SET LOCAL "request.jwt.claims" = '{"sub":"26f03ad3-d201-497b-92c8-dca93161e2f4"}';
    SELECT auth.uid() as uid;
  `;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testAuthUid();
