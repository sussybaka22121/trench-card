#!/usr/bin/env bash
# Install dependencies
npm install

# Install Chrome and dependencies needed for Puppeteer
apt-get update
apt-get install -y \
    fonts-liberation \
    gconf-service \
    libappindicator1 \
    libasound2 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libfontconfig1 \
    libgbm-dev \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libicu-dev \
    libjpeg-dev \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpng-dev \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils

# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
apt-get install -y -f

# Set the Puppeteer executable path
echo "export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)" >> $HOME/.bashrc
echo "export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)" >> $HOME/.profile
export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)

# Skip Puppeteer download since we installed Chrome manually
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install puppeteer

# Make the script executable
chmod +x render-build.sh 