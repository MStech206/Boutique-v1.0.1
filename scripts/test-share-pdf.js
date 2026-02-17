const fetch = require('node-fetch');
const fs = require('fs');

(async () => {
  const orderData = {
    orderId: `ORD-TEST-${Date.now()}`,
    customerName: 'Test Customer',
    customerPhone: '+919876543210',
    garmentType: 'Shirt',
    measurements: { chest: 38, waist: 32 },
    totalAmount: 500,
    advanceAmount: 250,
    deliveryDate: new Date().toISOString()
  };

  try {
    const res = await fetch('http://localhost:3000/api/share-order-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderData, sendNow: false })
    });
    const data = await res.json();
    console.log('Response:', data);

    if (data && data.success && (data.pdf.htmlPath || data.pdf.pdfPath)) {
      const localHtml = data.pdf.htmlPath || data.pdf.pdfPath;
      console.log('Saved PDF/HTML path:', localHtml);
    } else {
      console.error('PDF generation failed', data);
      process.exit(1);
    }
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
})();