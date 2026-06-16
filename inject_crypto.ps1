$htmlFiles = Get-ChildItem -Filter *.html
foreach ($file in $htmlFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'assets/js/api.js' -and $content -notmatch 'crypto-js') {
        $content = $content -replace '<script src="assets/js/api.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <script src="assets/js/api.js"></script>'
        Set-Content $file.FullName $content
        Write-Host "Updated $($file.Name)"
    }
}
