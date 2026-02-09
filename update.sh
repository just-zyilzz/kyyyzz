#!/bin/bash
echo "🚀 Starting Force Update..."

# Fetch latest changes
echo "📥 Fetching latest code..."
git fetch --all

# Reset to match remote exactly (discard local changes)
echo "🔄 Resetting to origin/main..."
git reset --hard origin/main

# Install dependencies (just in case)
echo "📦 Installing dependencies..."
npm install

# Restart PM2
echo "♻️ Restarting application..."
pm2 restart media-downloader

echo "✅ Update Complete!"
echo "📜 Showing valid cookies check..."
grep "cookies.txt" lib/instagram.js || echo "❌ WARNING: cookies logic not found in lib/instagram.js!"

echo "📜 Showing recent logs..."
pm2 logs media-downloader --lines 20 --nostream
