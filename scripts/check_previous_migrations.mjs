import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtpitwhslqjgbuwlsaqg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPrevious() {
  const tables = [
    'team_members',
    'transparency_snapshots',
    'neighborhoods'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`Table ${table}: NOT FOUND or Error: ${error.message}`);
    } else {
      console.log(`Table ${table}: FOUND`);
    }
  }
}

checkPrevious();
