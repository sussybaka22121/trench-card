module.exports = {
  // Use minimal browser configuration
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  headless: 'new',
  // You can adjust the path if needed
  executablePath: process.env.NODE_ENV === 'production' 
    ? '/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome-linux64/chrome'
    : undefined
}; 