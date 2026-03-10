const puppeteer = require('puppeteer');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();

        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
        page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));

        console.log('Navigating to http://localhost:5180...');
        await page.goto('http://localhost:5180', { waitUntil: 'networkidle2' });

        const html = await page.content();
        console.log('HTML Length:', html.length);

        await browser.close();
        process.exit(0);
    } catch (e) {
        console.error('PUPPETEER ERROR:', e);
        process.exit(1);
    }
})();
