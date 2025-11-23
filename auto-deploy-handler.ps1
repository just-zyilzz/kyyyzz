param(
    [string]$changedPath,
    [string]$changeType
)

# Handler script run as separate process/runspace. It expects to be located in repository root.
try {
    $scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
    Set-Location $scriptDir
} catch {
    Write-Host "Unable to change directory to script location: $_" -ForegroundColor Red
}

Write-Host "[handler] $changeType -> $changedPath" -ForegroundColor Yellow

# Determine branch
$branch = git rev-parse --abbrev-ref HEAD 2>$null
if (-not $branch) { $branch = 'main' }

function SyncRemote($branch) {
    Write-Host "[handler] Fetching remote..." -ForegroundColor Cyan
    git fetch origin 2>&1 | Out-Null

    Write-Host "[handler] Pulling (rebase + autostash) origin/$branch..." -ForegroundColor Cyan
    $pullOutput = git pull --rebase --autostash origin $branch 2>&1
    $pullExit = $LASTEXITCODE
    if ($pullExit -ne 0) {
        Write-Host "[handler] git pull returned exit $pullExit" -ForegroundColor Yellow
        Write-Host $pullOutput -ForegroundColor Yellow
        if ($pullOutput -match 'CONFLICT' -or $pullOutput -match 'Merge conflict') {
            Write-Host "[handler] Conflict detected during pull. Aborting rebase." -ForegroundColor Red
            git rebase --abort 2>$null
            return $false
        }
    }
    return $true
}

$ok = SyncRemote -branch $branch
if (-not $ok) { return }

$status = git status --porcelain
if (-not $status) {
    Write-Host "[handler] No changes to commit." -ForegroundColor Green
    return
}

Write-Host "[handler] Adding and committing changes..." -ForegroundColor Cyan
git add .
$commitMsg = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$commitOutput = git commit -m $commitMsg 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[handler] Commit did not create changes or failed:" -ForegroundColor Yellow
    Write-Host $commitOutput -ForegroundColor Yellow
} else {
    Write-Host "[handler] Commit created: $commitMsg" -ForegroundColor Green
}

Write-Host "[handler] Pushing to origin/$branch..." -ForegroundColor Cyan
$pushOutput = git push origin $branch 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[handler] Push successful." -ForegroundColor Green
} else {
    Write-Host "[handler] Push failed (exit $LASTEXITCODE)" -ForegroundColor Yellow
    Write-Host $pushOutput -ForegroundColor Yellow
    if ($pushOutput -match 'rejected' -or $pushOutput -match 'non-fast-forward') {
        Write-Host "[handler] Remote has new commits; trying sync and push again..." -ForegroundColor Cyan
        $ok2 = SyncRemote -branch $branch
        if ($ok2) {
            git push origin $branch
            if ($LASTEXITCODE -eq 0) { Write-Host "[handler] Push succeeded after sync." -ForegroundColor Green }
            else { Write-Host "[handler] Push still failed after sync; resolve manually." -ForegroundColor Red }
        }
    } elseif ($pushOutput -match 'Authentication failed' -or $pushOutput -match 'could not read Username') {
        Write-Host "[handler] Authentication failed. Configure credential helper or use a PAT." -ForegroundColor Red
    }
}
