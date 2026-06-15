$root = 'f:\CSEFEST\cse-fest-vme1\cse-fest-2'
$src = Join-Path $root 'src'
$files = Get-ChildItem -Path $src -Recurse -Filter '*.tsx' -File
$pattern = 'text-\[(?:8|9|10|11|12|13)px\]'
$total = 0
$perFile = @()
foreach ($f in $files) {
    $content = Get-Content -Raw -LiteralPath $f.FullName
    $matches = [regex]::Matches($content, $pattern)
    $count = $matches.Count
    if ($count -gt 0) {
        $new = [regex]::Replace($content, $pattern, 'text-sm')
        Set-Content -LiteralPath $f.FullName -Value $new -NoNewline
        $total += $count
        $perFile += [pscustomobject]@{ File = $f.FullName.Substring($root.Length + 1); Count = $count }
    }
}
$perFile | Sort-Object -Property File | Format-Table -AutoSize
Write-Output "TOTAL: $total"
