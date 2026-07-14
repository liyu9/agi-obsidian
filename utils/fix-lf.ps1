Get-ChildItem -Path "d:\360MoveData\Users\admin\Desktop\AgiP\AGI-obsidian\12-学习笔记\02-极客时间-Claude Code 企业级全链路开发实战" -Recurse -Filter "*.md" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw -Encoding UTF8
  if ($content -match '\\n') {
    $fixed = $content -replace '\\n', "`n"
    Set-Content -Path $_.FullName -Value $fixed -Encoding UTF8 -NoNewline
    Write-Host "Fixed: $($_.Name)" -ForegroundColor Green
  }
}
Write-Host "All done!" -ForegroundColor Cyan
