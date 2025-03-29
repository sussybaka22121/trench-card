#!/usr/bin/env bash
# Exit on error
set -e

# Install dependencies
npm ci

# Install Chrome specifically
echo "Installing Chrome..."
npx puppeteer install

# Verify installation
echo "Chrome installation completed, checking..."
CHROME_PATH=$(node -e "console.log(require('puppeteer').executablePath())")

if [ -f "$CHROME_PATH" ]; then
  echo "Chrome successfully installed at $CHROME_PATH"
  # Save the path for our app to use
  echo "export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH" >> ~/.bashrc
  export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH
else
  echo "Chrome installation failed"
  find /opt/render/.cache -name "chrome" -type f
  exit 1
fi

echo "Build completed" 