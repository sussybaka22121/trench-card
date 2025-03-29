#!/usr/bin/env bash
# Exit on error
set -e

# Install dependencies
npm ci

# Install Chrome for Puppeteer
npx puppeteer browsers install chrome

# Print verification that Chrome is installed
echo "Verifying Chrome installation..."
CHROME_PATH="/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome"

if [ -f "$CHROME_PATH" ]; then
  echo "Chrome is installed at $CHROME_PATH"
else
  echo "Chrome installation failed. Looking for Chrome in cache directory..."
  find /opt/render/.cache/puppeteer -type f -name "chrome" -o -name "chromium"
fi

echo "Build completed" 