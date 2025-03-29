const PCR = require('puppeteer-chromium-resolver');
const fs = require('fs');
const path = require('path');

// Look for installed Chrome path in different common locations
async function findChromePath() {
  // Check environment variable first
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    console.log(`Using Chrome from environment: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }
  
  // Try PCR resolver
  try {
    console.log('Trying PCR to find Chrome...');
    const pcrOptions = {
      revision: '', // blank revision will use the latest
      detectionPath: '',
      folderName: '.chromium-browser-snapshots',
      hosts: ['https://storage.googleapis.com', 'https://npm.taobao.org/mirrors'],
      retry: 3
    };
    
    const stats = await PCR(pcrOptions);
    console.log(`PCR resolved Chrome at: ${stats.executablePath}`);
    return stats.executablePath;
  } catch (e) {
    console.error('PCR failed to resolve Chrome:', e);
  }
  
  // Try common render.com locations
  const commonPaths = [
    '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome',
    '/opt/render/.cache/puppeteer/chrome-linux/chrome'
  ];
  
  for (const chromePath of commonPaths) {
    console.log(`Checking for Chrome at: ${chromePath}`);
    if (fs.existsSync(chromePath)) {
      console.log(`Found Chrome at: ${chromePath}`);
      return chromePath;
    }
  }
  
  console.log('No Chrome installation found. Will use default path.');
  return undefined; // Let Puppeteer use default
}

// Get Puppeteer launch options
async function getPuppeteerOptions() {
  const chromePath = await findChromePath();
  
  return {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions'
    ],
    executablePath: chromePath,
    headless: true
  };
}

module.exports = {
  getPuppeteerOptions
}; 