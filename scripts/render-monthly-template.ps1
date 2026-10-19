param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
# Word is a fallback when the bundled DOCX renderer cannot find LibreOffice on Windows.
$templatePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/modelos/relatorio-mensal-profissional.docx'))
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$pdfPath = [IO.Path]::GetFullPath((Join-Path $OutputDirectory 'relatorio-mensal-profissional.pdf'))
$wordApp = $null
$wordDocument = $null
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordDocument = $wordApp.Documents.Open($templatePath, $false, $true, $false)
    $wordDocument.ExportAsFixedFormat($pdfPath, 17)
    Write-Output $pdfPath
} finally {
    if ($null -ne $wordDocument) { $wordDocument.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordDocument) }
    if ($null -ne $wordApp) { $wordApp.Quit(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) }
}
