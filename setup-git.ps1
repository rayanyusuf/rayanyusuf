# Git Setup Script for GitHub Deployment
# Run this script after configuring your git identity

Write-Host "=== Git Setup for GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Check if git config is set
$userName = git config --global user.name
$userEmail = git config --global user.email

if (-not $userName -or -not $userEmail) {
    Write-Host "⚠️  Git user configuration not set!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run these commands first:" -ForegroundColor Yellow
    Write-Host '  git config --global user.name "Your Name"' -ForegroundColor White
    Write-Host '  git config --global user.email "your.email@example.com"' -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit
}

Write-Host "✅ Git configured: $userName <$userEmail>" -ForegroundColor Green
Write-Host ""

# Commit changes
Write-Host "Creating initial commit..." -ForegroundColor Cyan
git commit -m "Initial commit: A Level Math video gallery"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Commit created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Next Steps ===" -ForegroundColor Cyan
    Write-Host "1. Go to https://github.com/new" -ForegroundColor White
    Write-Host "2. Create a new repository (name: rayanyusuf or your choice)" -ForegroundColor White
    Write-Host "3. DO NOT initialize with README/gitignore" -ForegroundColor White
    Write-Host "4. Copy the commands GitHub shows you, or use:" -ForegroundColor White
    Write-Host ""
    Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git" -ForegroundColor Yellow
    Write-Host "   git branch -M main" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor Yellow
} else {
    Write-Host "❌ Commit failed. Check the error above." -ForegroundColor Red
}
