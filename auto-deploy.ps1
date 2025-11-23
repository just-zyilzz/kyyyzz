# auto-deploy.ps1

# Simple, robust auto-deploy watcher that Syncs (pull) before pushing.
Write-Host "Starting auto-deploy watcher..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "ERROR: This folder is not a Git repository. Run 'git init' first." -ForegroundColor Red
    exit 1
}

# Ensure remote origin configured
$expectedRemote = 'https://github.com/just-zyilzz/media-downloader.git'
$origin = git remote get-url origin 2>$null
if (-not $origin -or $origin -ne $expectedRemote) {
    Write-Host "Setting remote origin to $expectedRemote" -ForegroundColor Yellow
    git remote remove origin 2>$null
    git remote add origin $expectedRemote
}

# Determine current branch
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { $branch = 'main' }
Write-Host "Auto-deploy running on branch: $branch" -ForegroundColor Green

# Create watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# ScriptBlock for sync logic (useable from event runspace via $using:syncBlock)
$syncBlock = {
    param([string]$branch)
    Write-Host "Fetching remote updates..." -ForegroundColor Cyan
    git fetch origin 2>&1 | Out-Null

    Write-Host "Pulling remote changes (rebase, autostash)..." -ForegroundColor Cyan
    $pullOutput = git pull --rebase --autostash origin $branch 2>&1
    $pullExit = $LASTEXITCODE
    if ($pullExit -ne 0) {
        Write-Host "WARNING: git pull returned exit $pullExit" -ForegroundColor Yellow
        Write-Host $pullOutput -ForegroundColor Yellow
        if ($pullOutput -match 'CONFLICT' -or $pullOutput -match 'Merge conflict') {
            Write-Host "Rebase/merge conflict detected. Aborting rebase and skipping push." -ForegroundColor Red
            git rebase --abort 2>$null
            return $false
        }
    }
    return $true
}


# Build a scriptblock that calls the handler script. Use [ScriptBlock]::Create so $Event
# references are evaluated in the event-runspace rather than expanded now.
$handlerPath = Join-Path (Get-Location) 'auto-deploy-handler.ps1'
$escapedHandler = $handlerPath -replace "'", "''"
$ignorePatterns = @('\\.git\\', '\\node_modules\\', '\\.vs\\', '\\npm-debug.log', '\\package-lock.json')

# Build a scriptblock that filters events for ignored paths, then calls the handler
$action = [ScriptBlock]::Create(
        "`$p = `$Event.SourceEventArgs.FullPath; `n"
    + "if (-not `$p) { return } `n"
    + "$([string]::Join('', ($ignorePatterns | ForEach-Object { "if (`$p -match '$_') { return } `n" })))"
    + "& '$escapedHandler' `$p `$Event.SourceEventArgs.ChangeType"
)

# Register events with explicit SourceIdentifier so we can unregister cleanly
$evtChanged = Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action -SourceIdentifier FileChanged
$evtCreated = Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action -SourceIdentifier FileCreated
$evtDeleted = Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action -SourceIdentifier FileDeleted

Write-Host "Watching for file changes. Press Ctrl+C to stop." -ForegroundColor Cyan

try {
    while ($true) { Start-Sleep 1 }
} finally {
    Unregister-Event -SourceIdentifier FileChanged -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier FileCreated -ErrorAction SilentlyContinue
    Unregister-Event -SourceIdentifier FileDeleted -ErrorAction SilentlyContinue
    $watcher.Dispose()
    Write-Host "Auto-deploy stopped." -ForegroundColor Red
}