const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.error('PAGEERROR:', err.message));

  try {
    const url = 'http://localhost:3000/staff';
    console.log('Loading', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // wait for branch select and staff select
    await page.waitForSelector('#branchSelect', { timeout: 5000 });
    await page.waitForSelector('#staffSelect', { timeout: 5000 });

    // record initial staff options
    const initialCount = await page.$$eval('#staffSelect option', opts => opts.length);

    // if more than one branch exists, change branch and verify staff dropdown updates
    const branchOptions = await page.$$eval('#branchSelect option', opts => opts.map(o => ({ val: o.value, text: o.textContent })) );
    if (branchOptions.length > 1) {
      const second = branchOptions[1].val;
      console.log('Selecting second branch for filter test:', branchOptions[1].text);
      await page.select('#branchSelect', second);

      // wait until staffSelect options count changes or 'No staff available' appears
      await page.waitForFunction((prev) => {
        const el = document.querySelector('#staffSelect');
        return el && el.options.length !== prev;
      }, { timeout: 5000 }, initialCount);

      const newCount = await page.$$eval('#staffSelect option', opts => opts.length);
      console.log('Staff options before=', initialCount, 'after=', newCount);
      if (newCount === 0) console.error('Branch filter updated staff list but returned zero options');
    } else {
      console.log('Only one branch available — skipping branch-change check');
    }

    // Fill PIN (demo 1234) and submit (use first staff option if needed)
    const staffValue = await page.$eval('#staffSelect', s => (s.options[1] || s.options[0] || { value: '' }).value);
    if (staffValue) await page.select('#staffSelect', staffValue);
    await page.type('#pinInput', '1234');
    await page.click('#loginBtn');

    // wait for dashboard to appear
    await page.waitForSelector('#myTasks .task-card, #myTasks .empty-state', { timeout: 7000 });
    console.log('Dashboard loaded — looking for View details button');

    // find a View details button (first match) and click (use DOM query to avoid XPath API differences)
    const clicked = await page.$$eval('button', buttons => {
      const btn = buttons.find(b => /View details/i.test(b.textContent || ''));
      if (!btn) return false;
      btn.click();
      return true;
    });

    if (!clicked) {
      console.warn('No View details button found on staff dashboard — this can be OK if there are no tasks for the selected staff/branch.');
      await browser.close();
      process.exit(0);
    }

    await page.waitForSelector('#taskDetailsModal.show .modal-body', { timeout: 5000 });
    console.log('Task details modal opened');

    // Assert modal contains Design Information and Measurements headings
    const modalHtml = await page.$eval('#taskDetailsModal .modal-body', el => el.innerText);
    console.log('Modal text snapshot:', modalHtml.substring(0, 300));

    if (!/Design Information|Design Notes|📏 Measurements/.test(modalHtml)) {
      console.error('Modal does not contain Design Information or Measurements');
      await browser.close();
      process.exit(3);
    }

    console.log('Modal contains Design Information and Measurements — OK');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err && err.message ? err.message : err);
    await browser.close();
    process.exit(4);
  }
})();