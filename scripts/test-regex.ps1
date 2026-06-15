$path = 'f:\CSEFEST\cse-fest-vme1\cse-fest-2\src\components\public\NewsTicker.tsx'
$content = Get-Content -Raw -LiteralPath $path
$matches = [regex]::Matches($content, 'text-\[\d+px\]')
Write-Output "Total matches: $($matches.Count)"
foreach ($m in $matches) { Write-Output "  $($m.Value)" }
