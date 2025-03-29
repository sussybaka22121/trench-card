const puppeteer = require('puppeteer');
const fs = require('fs');

async function htmlToImage(html, options = {}) {
  console.log('Starting direct HTML to image conversion');
  let browser = null;
  
  try {
    // Launch browser with more direct options
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--single-process',
        '--headless'
      ],
      headless: 'new'
    };
    
    // Check for executable path
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log(`Using Chrome executable from env: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    console.log('Launching browser with options:', JSON.stringify(launchOptions));
    browser = await puppeteer.launch(launchOptions);
    
    const page = await browser.newPage();
    
    // Set viewport size (must match the card size in your HTML)
    await page.setViewport({
      width: 600,
      height: 800,
      deviceScaleFactor: 1,
    });
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('HTML content set, taking screenshot');
    
    // Take screenshot
    const buffer = await page.screenshot({
      type: options.type || 'png',
      quality: options.quality || 100,
      fullPage: false
    });
    
    await browser.close();
    console.log('Browser closed successfully');
    
    return buffer;
  } catch (error) {
    console.error('Error in htmlToImage:', error);
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    throw error;
  }
}

module.exports = htmlToImage; 