const assert = require('assert');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const fixturePath = path.resolve(__dirname, 'fixtures', 'order-form-test.html');
  // Ensure proper file:// URL on Windows and encode spaces
  const raw = 'file:///' + fixturePath.replace(/\\/g, '/');
  const fileUrl = encodeURI(raw);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Pipe page console messages to node console for diagnostics
  page.on('console', msg => {
    try { console.log('PAGE LOG >', msg.text()); } catch(e) { /* ignore */ }
  });

  try {
    // Open fixture and wait for DOMContentLoaded (disable default timeout to avoid slow file:// load issues)
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 0 });

    // Diagnostic: list scripts and check if canonical function is already present
    const diag = await page.evaluate(() => ({
      scripts: Array.from(document.scripts || []).map(s => s.src || s.getAttribute('src')),
      hasCanonical: !!(window._canonicalCalculateTotal && typeof window._canonicalCalculateTotal === 'function')
    }));

    if (!diag.hasCanonical) {
      const html = await page.content();
      console.error('\n❌ Fixture did not initialize canonical calculateTotal.');
      console.error('Scripts on page:', diag.scripts);
      // write a short portion of HTML for debugging
      console.error('--- begin page HTML (truncated) ---');
      console.error(html.slice(0, 400));
      console.error('--- end page HTML (truncated) ---\n');
      throw new Error('Canonical calculateTotal not found on fixture page');
    }

    // verify initial base price is 1000 (set by fixture)
    const initial = await page.evaluate(() => {
      return {
        basePriceJS: window.currentOrder.pricing.basePrice,
        basePriceDisplayed: document.getElementById('basePrice').textContent.trim(),
        subtotalDisplayed: document.getElementById('subtotal').textContent.trim()
      };
    });

    // dump currentOrder for debugging
    const orderDump = await page.evaluate(() => ({ pricing: window.currentOrder.pricing }));
    console.log('PAGE STATE >', JSON.stringify(orderDump));

    assert.strictEqual(initial.basePriceJS, 1000, 'initial JS basePrice should be 1000');
    assert.ok(initial.basePriceDisplayed.includes('1000'), 'initial displayed basePrice should include 1000');

    // 1) Enter otherExpenses and ensure basePrice is NOT zeroed
    await page.$eval('#otherExpenses', (el) => { el.value = '150'; el.dispatchEvent(new Event('input', { bubbles: true })); });

    // quick diagnostic: verify input value and JS model immediately
    const immediateOtherInput = await page.$eval('#otherExpenses', el => el.value);
    const immediateOtherModel = await page.evaluate(() => window.currentOrder.pricing.otherExpenses);
    console.log('PAGE DIAG > otherExpenses input value=', immediateOtherInput, 'model=', immediateOtherModel);

    // wait for model update (guarantee canonical calculateTotal ran)
    await page.waitForFunction('window.currentOrder.pricing.otherExpenses === 150');

    const afterOther = await page.evaluate(() => ({
      basePriceJS: window.currentOrder.pricing.basePrice,
      addonPriceJS: window.currentOrder.pricing.addonPrice,
      otherExpensesJS: window.currentOrder.pricing.otherExpenses,
      subtotalJS: window.currentOrder.pricing.subtotal,
      displayedBase: document.getElementById('basePrice').textContent.trim(),
      displayedSubtotal: document.getElementById('subtotal').textContent.trim()
    }));

    assert.strictEqual(afterOther.basePriceJS, 1000, 'basePrice must remain 1000 after otherExpenses input');
    assert.strictEqual(afterOther.otherExpensesJS, 150, 'otherExpenses should be 150');
    assert.strictEqual(afterOther.subtotalJS, 1150, 'subtotal should be base + otherExpenses (1150)');
    assert.ok(afterOther.displayedSubtotal.includes('1150'), 'displayed subtotal should update to 1150');

    // 2) Enable "Other" addon, set addonOtherPrice and verify addonPrice contributes
    await page.$eval('#addonOtherCheck', el => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.$eval('#addonOtherPrice', el => { el.disabled = false; el.value = '200'; el.dispatchEvent(new Event('input', { bubbles: true })); });

    // diagnostic: immediate values after setting addon
    const immediateAddonInput = await page.evaluate(() => ({
      checkbox: document.getElementById('addonOtherCheck').checked,
      addonOtherPriceValue: document.getElementById('addonOtherPrice').value,
      addonPriceModel: window.currentOrder.pricing.addonPrice,
      subtotalModel: window.currentOrder.pricing.subtotal
    }));
    console.log('PAGE DIAG > addon immediate ->', immediateAddonInput);

    await page.waitForFunction('window.currentOrder.pricing.addonPrice === 200');

    const afterAddon = await page.evaluate(() => ({
      addonPriceJS: window.currentOrder.pricing.addonPrice,
      subtotalJS: window.currentOrder.pricing.subtotal,
      displayedAddon: document.getElementById('addonPrice').textContent.trim(),
      displayedSubtotal: document.getElementById('subtotal').textContent.trim()
    }));

    assert.strictEqual(afterAddon.addonPriceJS, 200, 'addonPrice should be 200 after setting addonOtherPrice');
    assert.strictEqual(afterAddon.subtotalJS, 1350, 'subtotal should be base + other + addon (1350)');
    assert.ok(afterAddon.displayedAddon.includes('200'), 'displayed addon should include 200');

    // 3) Set advance payment and verify balance calculation
    await page.$eval('#advancePayment', el => { el.value = '500'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction('window.currentOrder.pricing.advance === 500');

    const afterAdvance = await page.evaluate(() => ({
      totalJS: window.currentOrder.pricing.total,
      advanceJS: window.currentOrder.pricing.advance,
      balanceJS: window.currentOrder.pricing.balance,
      displayedTotal: document.getElementById('totalAmount').textContent.trim(),
      displayedBalance: document.getElementById('balanceDue').textContent.trim()
    }));

    assert.strictEqual(afterAdvance.totalJS, 1350, 'total should be 1350 before advance');
    assert.strictEqual(afterAdvance.advanceJS, 500, 'advance should be 500');
    assert.strictEqual(afterAdvance.balanceJS, 850, 'balance should be total - advance (850)');
    assert.ok(afterAdvance.displayedBalance.includes('850'), 'displayed balance should include 850');

    console.log('✅ UI pricing regression test passed');
    await browser.close();
    process.exit(0);
  } catch (err) {
    await browser.close();
    console.error('❌ UI pricing regression test failed:', err && err.message);
    process.exit(1);
  }
})();