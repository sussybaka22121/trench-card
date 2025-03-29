module.exports = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--single-process'
  ],
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
};