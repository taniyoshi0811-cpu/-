$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "文化祭予算サーバー.lnk"
$targetPath = Join-Path $projectDir "start-server.bat"

if (-not (Test-Path $targetPath)) {
  Write-Error "start-server.bat が見つかりません: $targetPath"
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectDir
$shortcut.WindowStyle = 7
$shortcut.Description = "文化祭予算サーバーを起動"
$shortcut.Save()

Write-Host "スタートアップ登録が完了しました: $shortcutPath"
