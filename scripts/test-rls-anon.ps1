$base = "https://gtpitwhslqjgbuwlsaqg.supabase.co/rest/v1"
$ak = $env:SUPABASE_ANON_KEY
if (-not $ak) { Write-Error "Defina SUPABASE_ANON_KEY"; exit 1 }

$out = @()

try {
    $r = Invoke-WebRequest -Uri "$base/neighborhoods?select=name,status&status=eq.oficial&limit=5" `
        -Headers @{ apikey=$ak; Authorization="Bearer $ak" } `
        -UseBasicParsing
    $out += "HTTP_STATUS=$($r.StatusCode)"
    $out += "BODY=$($r.Content)"
} catch {
    $out += "HTTP_ERROR=$($_.Exception.Message)"
    $out += "DETAIL=$($_.ErrorDetails.Message)"
}

$out | Set-Content "c:\Projetos\SEMEAR TERRITORIOS\scripts\rls-test-result.txt" -Encoding UTF8
Write-Host "DONE"
