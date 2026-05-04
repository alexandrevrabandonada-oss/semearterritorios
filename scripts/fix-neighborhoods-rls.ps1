$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) { Write-Error "Defina SUPABASE_ACCESS_TOKEN"; exit 1 }
$uri = "https://api.supabase.com/v1/projects/gtpitwhslqjgbuwlsaqg/database/query"
$h = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$sql = @"
-- Bairros/territórios são agregações geográficas públicas, não dados pessoais.
-- Leitura pública é necessária para que os selects operacionais funcionem sem login.
drop policy if exists "Leitura pública de bairros" on public.neighborhoods;
create policy "Leitura pública de bairros"
  on public.neighborhoods
  for select
  to anon, authenticated
  using (true);
"@

$payload = @{ query = $sql } | ConvertTo-Json -Depth 3 -Compress
try {
    $r = Invoke-RestMethod -Method Post -Uri $uri -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($payload))
    "POLICY OK: $($r | ConvertTo-Json -Compress)" | Set-Content "scripts\rls-fix-result.txt" -Encoding UTF8
    Write-Host "DONE"
} catch {
    "ERRO: $($_.Exception.Message) | $($_.ErrorDetails.Message)" | Set-Content "scripts\rls-fix-result.txt" -Encoding UTF8
    Write-Host "ERRO"
}
