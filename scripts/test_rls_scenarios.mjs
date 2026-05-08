import fetch from 'node-fetch';

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'gtpitwhslqjgbuwlsaqg';
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function runSql(sql) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return await response.json();
}

async function testRls() {
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN is required');
    process.exit(1);
  }

  const testEquipeId = '00000000-0000-0000-0000-000000000001';
  const testCoordId = '00000000-0000-0000-0000-000000000002';
  const testAdminId = '08de6c9c-acf3-4556-b970-268c40d903ce'; // Existing admin

  console.log('Starting RLS Logic Validation...');

  const testScript = `
DO $$
DECLARE
  v_equipe_profile_id uuid := '26f03ad3-d201-497b-92c8-dca93161e2f4'; -- pvand1@gmail.com
  v_coord_profile_id uuid := '8b19289b-70d1-43a7-9fa3-8a61bee5ff40'; -- juliamoreira@id.uff.br
  v_team_member_id uuid;
  v_report_id uuid;
  v_count integer;
BEGIN
  -- SETUP: Temporarily set roles
  UPDATE public.profiles SET role = 'equipe' WHERE id = v_equipe_profile_id;
  UPDATE public.profiles SET role = 'coordenacao' WHERE id = v_coord_profile_id;

  -- Ensure team member exists for equipe
  SELECT id INTO v_team_member_id FROM public.team_members WHERE profile_id = v_equipe_profile_id LIMIT 1;
  IF v_team_member_id IS NULL THEN
    INSERT INTO public.team_members (profile_id, display_name, active)
    VALUES (v_equipe_profile_id, 'Equipe Teste', true)
    RETURNING id INTO v_team_member_id;
  END IF;

  -- TEST 1: Equipe creating own report
  -- Simulate equipe session
  EXECUTE 'SET LOCAL "request.jwt.claims" = ' || quote_literal('{"sub":"' || v_equipe_profile_id || '"}');
  -- Try INSERT as postgres first
  INSERT INTO public.weekly_team_reports (
    week_start, week_end, team_member_id, profile_id, title, status, created_by
  ) VALUES (
    current_date, current_date + 6, v_team_member_id, v_equipe_profile_id, 'Relatorio Teste Equipe', 'draft', v_equipe_profile_id
  ) RETURNING id INTO v_report_id;
  RAISE NOTICE 'Insert as postgres successful: %', v_report_id;
  DELETE FROM public.weekly_team_reports WHERE id = v_report_id;

  SET LOCAL role authenticated;
  -- Try INSERT as equipe
  INSERT INTO public.weekly_team_reports (
    week_start, week_end, team_member_id, profile_id, title, status, created_by
  ) VALUES (
    current_date, current_date + 6, v_team_member_id, v_equipe_profile_id, 'Relatorio Teste Equipe', 'draft', v_equipe_profile_id
  ) RETURNING id INTO v_report_id;

  RAISE NOTICE 'Test 1 Passed: Equipe created report %', v_report_id;

  -- TEST 2: Equipe reading own report
  SELECT count(*) INTO v_count FROM public.weekly_team_reports WHERE id = v_report_id;
  IF v_count = 1 THEN
    RAISE NOTICE 'Test 2 Passed: Equipe read own report';
  ELSE
    RAISE EXCEPTION 'Test 2 Failed: Equipe could not read own report';
  END IF;

  -- TEST 3: Equipe trying to approve own report (Update status to approved)
  BEGIN
    UPDATE public.weekly_team_reports SET status = 'approved' WHERE id = v_report_id;
    -- Wait, the policy for update says:
    -- using (public.get_user_role() in ('admin', 'coordenacao') or public.can_edit_weekly_team_report(id))
    -- with check (public.get_user_role() in ('admin', 'coordenacao') or (is_owner and status in ('draft', 'needs_changes', 'submitted') and reviewed_by is null))
    -- So if status is changed to approved, the WITH CHECK should fail if not admin/coord.
    
    -- Let's see if it fails.
    RAISE EXCEPTION 'Test 3 Failed: Equipe was able to approve own report';
  EXCEPTION WHEN check_violation OR insufficient_privilege THEN
    RAISE NOTICE 'Test 3 Passed: Equipe blocked from approving own report';
  END;

  -- TEST 4: Coord reading reports
  RESET role; -- Back to postgres to change claims
  EXECUTE 'SET LOCAL "request.jwt.claims" = ' || quote_literal('{"sub":"' || v_coord_profile_id || '"}');
  SET LOCAL role authenticated;
  
  SELECT count(*) INTO v_count FROM public.weekly_team_reports WHERE id = v_report_id;
  IF v_count = 1 THEN
    RAISE NOTICE 'Test 4 Passed: Coord read equipe report';
  ELSE
    RAISE EXCEPTION 'Test 4 Failed: Coord could not read equipe report';
  END IF;

  -- We'll use a table to store results or just RAISE EXCEPTION on failure with success message.
  -- Since we want to know it finished, we'll raise an exception at the end with the summary.
  RAISE EXCEPTION 'ALL_TESTS_PASSED';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ALL_TESTS_PASSED' THEN
    RAISE NOTICE 'Success';
  ELSE
    RAISE EXCEPTION 'TEST_FAILED: %', SQLERRM;
  END IF;
END $$;
`;

  const result = await runSql(testScript);
  console.log(JSON.stringify(result, null, 2));
}

testRls();
