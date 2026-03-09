const puppeteer = require('puppeteer');

(async () => {
  console.log('🔬 E2E: dashboard firestore fallback — starting');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Set auth state before page loads so dashboard auto-initializes
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('sapthala_logged_in', 'true');
    localStorage.setItem('sapthala_token', 'BYPASS_TOKEN_TEST');
    localStorage.setItem('sapthala_user', JSON.stringify({ id: 'bypass', username: 'admin', role: 'admin', permissions: { canViewReports: true } }));
  });

  // Intercept network requests and force Firestore/public reports to fail
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/public/reports/last-orders') || url.includes('/api/firebase/status') || url.includes('/api/admin/orders/firebase/list') || url.includes('/api/dashboard')) {
      // Simulate service unavailable
      console.log('[E2E] Intercepting and mocking (503):', url);
      req.respond({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Simulated DB down' }) });
      return;
    }
    req.continue();
  });

  page.on('console', msg => console.log('[PAGE]', msg.text()));
  page.on('response', resp => {
    const url = resp.url();
    if (url.includes('/api/')) {
      console.log('[RESPONSE]', resp.status(), url);
    }
  });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the category and revenue chart canvases to be present
    // Wait until updateDashboardStats is available, then call it (it will call renderDashboardCharts internally)
    await page.waitForFunction('typeof updateDashboardStats === "function"', { timeout: 10000 });
    await page.evaluate(() => { try { updateDashboardStats(); } catch (e) { console.error('updateDashboardStats invocation failed', e); } });

    // Collect debug info from page: presence of canvases and attached Chart instances
    const debugInfo = await page.evaluate(() => {
      const catEl = document.getElementById('categoryChart');
      const revEl = document.getElementById('revenueChart');

      const catExists = !!catEl;
      const revExists = !!revEl;

      const catChart = catEl && (catEl._chart || (window.Chart && window.Chart.getChart && window.Chart.getChart(catEl)));
      const revChart = revEl && (revEl._chart || (window.Chart && window.Chart.getChart && window.Chart.getChart(revEl)));

      return {
        catExists,
        revExists,
        catHasChart: !!catChart,
        revHasChart: !!revChart,
        catLabels: catChart && catChart.config && catChart.config.data ? catChart.config.data.labels : null,
        revData: revChart && revChart.config && revChart.config.data ? revChart.config.data.datasets[0].data : null
      };
    });

    console.log('[E2E DEBUG]', debugInfo);

    const categoryLabels = debugInfo.catLabels;
    const revenueData = debugInfo.revData;

    if (Array.isArray(categoryLabels) && categoryLabels[0] === 'No data' && Array.isArray(revenueData) && revenueData.every(v => v === 0)) {
      console.log('✅ E2E passed: dashboard shows fallback charts when Firestore is unavailable');
      await browser.close();
      process.exit(0);
    } else {
      console.error('❌ E2E failed: dashboard did not render expected fallback charts', { categoryLabels, revenueData });
      await browser.close();
      process.exit(2);
    }
  } catch (err) {
    console.error('❌ E2E encountered an error:', err.message);
    await browser.close();
    process.exit(3);
  }
})();