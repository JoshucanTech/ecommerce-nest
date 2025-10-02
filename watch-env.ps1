# PowerShell script to watch .env file changes and restart NestJS server

Write-Host "Watching .env file for changes..." -ForegroundColor Green

# Start the NestJS development server in the background
$job = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot
    npm run dev
}

# Watch for .env file changes
$envFile = Join-Path $PSScriptRoot ".env"
$lastWriteTime = (Get-Item $envFile).LastWriteTime

while ($true) {
    Start-Sleep -Seconds 2
    
    $currentWriteTime = (Get-Item $envFile).LastWriteTime
    
    if ($currentWriteTime -ne $lastWriteTime) {
        Write-Host ".env file changed, restarting server..." -ForegroundColor Yellow
        
        # Stop the current job
        Stop-Job $job
        Remove-Job $job
        
        # Start a new job
        $job = Start-Job -ScriptBlock {
            Set-Location $using:PSScriptRoot
            npm run dev
        }
        
        $lastWriteTime = $currentWriteTime
        Write-Host "Server restarted!" -ForegroundColor Green
    }
    
    # Show job output
    $output = Receive-Job $job
    if ($output) {
        Write-Host $output
    }
}