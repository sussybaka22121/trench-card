#!/usr/bin/env bash
# Exit on error
set -e

# Install dependencies
npm ci

# Install Chrome explicitly with browsers command
echo "Installing Chrome..."
npx puppeteer browsers install chrome

# Find the installed Chrome path
echo "Locating Chrome installation..."
CHROME_DIR=$(find /opt/render/.cache/puppeteer -type d -name "chrome-linux*" | head -n 1)

if [ -n "$CHROME_DIR" ]; then
  CHROME_PATH="$CHROME_DIR/chrome"
  echo "Chrome directory found at: $CHROME_DIR"
  echo "Chrome executable should be at: $CHROME_PATH"
  
  # Make Chrome executable
  chmod +x "$CHROME_PATH"
  
  # Save path to environment for runtime
  echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> $HOME/.bashrc
  echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> $HOME/.profile
  
  # Create permanent environment variable on Render
  mkdir -p /opt/render/project/.render/
  echo "PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> /opt/render/project/.render/env
else
  echo "Chrome installation not found! Searching for any Chrome binaries..."
  find /opt/render/.cache -name "chrome" -type f
  echo "Failed to locate Chrome installation."
  exit 1
fi

echo "Build completed" 