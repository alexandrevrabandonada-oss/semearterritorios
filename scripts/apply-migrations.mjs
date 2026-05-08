import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'gtpitwhslqjgbuwlsaqg';
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

const migrations = [
  'supabase/migrations/20260507120000_create_project_memory_weekly_reports.sql',
  'supabase/migrations/20260508090000_expand_project_memory_entries.sql'
];

async function applyMigrations() {
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN is required');
    process.exit(1);
  }

  for (const file of migrations) {
    console.log(`\n--- Applying ${file} ---`);
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${file}`);
      break;
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('OK: Migration applied.');
      } else {
        console.error(`ERRO: ${response.status} ${response.statusText}`);
        console.error('DETALHE:', JSON.stringify(result, null, 2));
        break;
      }
    } catch (error) {
      console.error('ERRO:', error.message);
      break;
    }
  }
  console.log('\nFIM');
}

applyMigrations();
