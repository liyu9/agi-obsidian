$baseDir = "d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\12-学习笔记\AI量化思维课\极客时间-人人都用得上的 AI 量化思维课"
$files = @("05｜赌徒的最后一道防线：凯利公式的仓位哲学.md", "26｜散户的起义：GME逼空华尔街.md")
$pattern = "!\[\]\(data:image/png;base64,([^)]+)\)"

foreach ($f in $files) {
    $fpath = Join-Path $baseDir $f
    $content = Get-Content $fpath -Raw
    $matches = [regex]::Matches($content, $pattern)
    Write-Host "$f : $($matches.Count) 个base64图片"

    for ($i = 0; $i -lt $matches.Count; $i++) {
        $data = $matches[$i].Groups[1].Value
        try {
            $bytes = [Convert]::FromBase64String($data)
            $cleanName = $f -replace '[｜:?！]', '' -replace '\s+', '_'
            $name = "${cleanName}_formula$($i+1).png"
            $path = Join-Path (Join-Path $baseDir "assets") $name
            [IO.File]::WriteAllBytes($path, $bytes)
            $sizeKB = [math]::Round($bytes.Length / 1KB, 1)
            Write-Host "  提取: $name ($sizeKB KB)"
        } catch {
            Write-Host "  失败: $($_.Exception.Message)"
        }
    }
}
Write-Host "完成！"