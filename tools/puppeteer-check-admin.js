const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));
  page.on('requestfailed', req => logs.push({ type: 'requestfailed', url: req.url(), status: req.failure().errorText }));

  const paths = ['/', '/admin-panel.html', '/admin-complete.html', '/emxplw.html', '/sapthala-admin.html', '/sapthala-admin-consolidated.html'];
  for (const p of paths) {
    logs.length = 0;
    try {
      const url = 'http://localhost:3000' + p;
      const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });
      console.log('\n=== Loaded', url, 'status=' + (resp && resp.status()));
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error('Navigation failed for', p, err.message);
      continue;
    }

    const pageLogs = logs.filter(l => l.type !== 'status');
    if (pageLogs.length === 0) console.log('No console messages or page errors captured for', p);
    else {
      console.log('Captured logs for', p + ':');
      pageLogs.forEach(l => console.log(`${l.type}: ${l.text || l.url || JSON.stringify(l)}`));
    }
  }

  await browser.close();
})();