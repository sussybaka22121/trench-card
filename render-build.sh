#!/usr/bin/env bash
# Exit on error
set -e

# Install dependencies (use npm install instead of npm ci to regenerate lock file)
echo "Installing dependencies..."
npm install

# Install Chrome with multiple approaches
echo "Installing Chrome via Puppeteer..."
# Method 1: Use npx puppeteer
npx puppeteer browsers install chrome
echo "Chrome installation via Puppeteer completed"

# Method 2: Direct download as fallback
echo "Installing puppeteer-chromium-resolver..."
npm install puppeteer-chromium-resolver --save
echo "Puppeteer-chromium-resolver installed"

# Find all Chrome installations
echo "Searching for Chrome installations..."
CHROME_PATHS=$(find /opt/render/.cache -name "chrome" -type f -executable | grep -v "nacl_helper")

if [ -n "$CHROME_PATHS" ]; then
  echo "Found Chrome executables at:"
  echo "$CHROME_PATHS"
  
  # Use the first found Chrome
  CHROME_PATH=$(echo "$CHROME_PATHS" | head -n 1)
  
  # Make all Chrome binaries executable
  for chrome in $CHROME_PATHS; do
    chmod +x "$chrome"
    echo "Made executable: $chrome"
  done
  
  # Save Chrome path to environment
  echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> $HOME/.bashrc
  echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> $HOME/.profile
  
  # Create render env var file
  mkdir -p /opt/render/project/.render/
  echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" > /opt/render/project/.render/env
  
  echo "Chrome executable path set to: $CHROME_PATH"
else
  echo "No Chrome installation found! Please check the logs."
  echo "Listing contents of puppeteer cache directory:"
  find /opt/render/.cache/puppeteer -type d
fi

echo "Build completed" 