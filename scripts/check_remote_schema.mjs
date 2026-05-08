import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gtpitwhslqjgbuwlsaqg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const tables = [
    'weekly_team_reports',
    'weekly_team_report_actions',
    'weekly_team_report_neighborhoods',
    'weekly_team_report_attachments',
    'project_memory_entries'
  ];

  console.log('Checking tables...');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`Table ${table}: NOT FOUND or Error: ${error.message}`);
    } else {
      console.log(`Table ${table}: FOUND`);
    }
  }

  console.log('\nChecking functions...');
  const functions = [
    'is_weekly_team_report_owner',
    'can_read_weekly_team_report',
    'can_edit_weekly_team_report'
  ];

  for (const fn of functions) {
    const { data, error } = await supabase.rpc(fn, { report_id: '00000000-0000-0000-0000-000000000000' });
    if (error && error.message.includes('does not exist')) {
      console.log(`Function ${fn}: NOT FOUND`);
    } else {
      console.log(`Function ${fn}: FOUND (or error: ${error?.message})`);
    }
  }

  console.log('\nChecking bucket...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    console.log(`Error listing buckets: ${bucketError.message}`);
  } else {
    const bucket = buckets.find(b => b.id === 'project-memory-documents');
    if (bucket) {
      console.log(`Bucket project-memory-documents: FOUND (Public: ${bucket.public})`);
    } else {
      console.log('Bucket project-memory-documents: NOT FOUND');
    }
  }
}

checkSchema();
