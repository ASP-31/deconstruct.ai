const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for any client-side errors
    
    if (errors.length > 0) {
      console.log('CONSOLE ERRORS:');
      errors.forEach(e => console.log(' - ' + e));
    } else {
      console.log('No console errors found');
    }
    
    // Check if the page content is rendered
    const content = await page.content();
    if (content.includes('Deconstruct.ai')) {
      console.log('Page content rendered correctly');
    } else {
      console.log('Page content NOT rendered - likely crashed after hydration');
      console.log('Body HTML:', await page.locator('body').innerHTML());
    }
  } catch (err) {
    console.log('Error loading page:', err.message);
  }
  
  await browser.close();
})();