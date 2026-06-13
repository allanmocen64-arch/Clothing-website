$files = @("index.html", "index.css", "index.js")

function Strip-HtmlComments {
    param([string]$text)
    return [regex]::Replace($text, '<!--[\s\S]*?-->', '')
}

function Strip-JsCssComments {
    param([string]$text)

    $sb = New-Object System.Text.StringBuilder
    $state = 'normal'
    $quote = $null
    $i = 0
    $n = $text.Length

    while ($i -lt $n) {
        $ch = $text[$i]
        $nxt = if ($i + 1 -lt $n) { $text[$i + 1] } else { '' }

        if ($state -eq 'normal') {
            if ($ch -eq '/' -and $nxt -eq '/') {
                $i += 2
                while ($i -lt $n -and $text[$i] -ne "`n") { $i++ }
                continue
            }

            if ($ch -eq '/' -and $nxt -eq '*') {
                $i += 2
                while ($i + 1 -lt $n -and -not ($text[$i] -eq '*' -and $text[$i + 1] -eq '/')) { $i++ }
                $i += 2
                continue
            }

            if ($ch -eq '"' -or $ch -eq "'" -or $ch -eq '`') {
                $state = 'string'
                $quote = $ch
                $sb.Append($ch) | Out-Null
                $i++
                continue
            }

            if ($ch -eq '\\') {
                $sb.Append($ch) | Out-Null
                $i++
                if ($i -lt $n) { $sb.Append($text[$i]) | Out-Null; $i++ }
                continue
            }

            $sb.Append($ch) | Out-Null
            $i++
            continue
        }

        $sb.Append($ch) | Out-Null
        if ($ch -eq '\\') {
            $i++
            if ($i -lt $n) { $sb.Append($text[$i]) | Out-Null; $i++ }
            continue
        }

        if ($ch -eq $quote) {
            $state = 'normal'
            $quote = $null
        }
        $i++
    }

    return $sb.ToString()
}

foreach ($fname in $files) {
    $path = Join-Path -Path (Get-Location) -ChildPath $fname
    $text = Get-Content -Raw -Path $path
    if ($fname -like '*.html') {
        $newText = Strip-HtmlComments -text $text
    } else {
        $newText = Strip-JsCssComments -text $text
    }
    Set-Content -Path $path -Value $newText -Encoding utf8
    Write-Output "$fname cleaned"
}
