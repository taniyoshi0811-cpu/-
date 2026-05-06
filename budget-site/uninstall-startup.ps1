$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "文化祭予算サーバー.lnk"

if (Test-Path $shortcutPath) {
  Remove-Item $shortcutPath -Force
  Write-Host "スタートアップ登録を解除しました: $shortcutPath"
} else {
  Write-Host "解除対象が見つかりませんでした: $shortcutPath"
}
