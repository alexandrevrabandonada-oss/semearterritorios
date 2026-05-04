param(
    [string]$Token,
    [string]$ProjectRef = "gtpitwhslqjgbuwlsaqg"
)

$uri = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"
$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

$migrations = @(
    "supabase\migrations\20260504142500_extend_neighborhoods_official_metadata.sql",
    "supabase\migrations\20260504143000_apply_official_neighborhoods_volta_redonda.sql"
)

foreach ($file in $migrations) {
    $name = Split-Path $file -Leaf
    Write-Host "`n--- $name ---"
    $sql = Get-Content $file -Raw -Encoding UTF8
    $payload = [System.Text.Encoding]::UTF8.GetBytes((@{ query = $sql } | ConvertTo-Json -Depth 3 -Compress))
    try {
        $res = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload
        Write-Host "OK: $($res | ConvertTo-Json -Depth 3 -Compress)"
    } catch {
        $detail = $_.ErrorDetails.Message
        Write-Host "ERRO: $($_.Exception.Message)"
        if ($detail) { Write-Host "DETALHE: $detail" }
    }
}

Write-Host "`nFIM"
