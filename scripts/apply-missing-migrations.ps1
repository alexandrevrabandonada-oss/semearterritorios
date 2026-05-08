param(
    [string]$Token = $env:SUPABASE_ACCESS_TOKEN,
    [string]$ProjectRef = $(if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { "gtpitwhslqjgbuwlsaqg" })
)

if (-not $Token) {
    Write-Error "SUPABASE_ACCESS_TOKEN is required"
    exit 1
}

$uri = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"
$headers = @{ Authorization = "Bearer $Token"; "Content-Type" = "application/json" }

$migrations = @(
    "supabase\migrations\20260506180000_create_public_transparency_snapshots.sql",
    "supabase\migrations\20260506193000_extend_public_transparency_snapshots_editorial_flow.sql",
    "supabase\migrations\20260506210000_add_transparency_editorial_audit_trail.sql",
    "supabase\migrations\20260506223000_add_transparency_homologation_packages.sql",
    "supabase\migrations\20260507120000_create_project_memory_weekly_reports.sql"
)

foreach ($file in $migrations) {
    $name = Split-Path $file -Leaf
    Write-Host "`n--- Applying $name ---"
    if (Test-Path $file) {
        $sql = Get-Content $file -Raw -Encoding UTF8
        $payload = @{ query = $sql }
        try {
            $res = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body ($payload | ConvertTo-Json -Depth 3)
            Write-Host "OK: Migration applied."
        } catch {
            $detail = $_.ErrorDetails.Message
            Write-Host "ERRO: $($_.Exception.Message)"
            if ($detail) { Write-Host "DETALHE: $detail" }
            # Stop execution on error to avoid inconsistent state
            break
        }
    } else {
        Write-Host "ERRO: File not found: $file"
        break
    }
}

Write-Host "`nFIM"
