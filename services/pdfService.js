const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PDFService {
    static async generateOrderPDF(order, settings) {
        // Return HTML invoice (existing behavior)
        const logoPath = path.join(__dirname, '..', 'img', 'sapthala logo.png');
        const logoBase64 = fs.existsSync(logoPath) 
            ? `data:image/png;base64,${fs.readFileSync(logoPath, 'base64')}`
            : '';

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${order.orderId || ''}</title>
  <style>
    body{font-family: Arial, Helvetica, sans-serif; margin:20px;color:#222}
    .header{display:flex;align-items:center;gap:20px}
    .company{font-size:20px;font-weight:700;color:#8b4513}
    .section{margin-top:20px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#f3f4f6}
    .print{position:fixed;top:20px;right:20px;padding:10px;border-radius:8px;background:#8b4513;color:#fff}
  </style>
</head>
<body>
  <div class="print"><button onclick="window.print()" style="background:transparent;color:inherit;border:0;cursor:pointer">🖨 Print</button></div>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:70px;border-radius:8px"/>` : ''}
    <div>
      <div class="company">${settings.companyName || 'SAPTHALA Designer Workshop'}</div>
      <div>${settings.address || ''}</div>
      <div>${settings.phone || ''} | ${settings.email || ''}</div>
    </div>
  </div>

  <div class="section">
    <strong>Invoice:</strong> ${order.orderId || ''}<br/>
    <strong>Date:</strong> ${new Date(order.createdAt || Date.now()).toLocaleString()}<br/>
    <strong>Customer:</strong> ${order.customerName || order.customer?.name || ''} | ${order.customerPhone || order.customer?.phone || ''}
  </div>

  <div class="section">
    <strong>Garment:</strong> ${order.garmentType || order.garment?.name || ''}
  </div>

  <div class="section">
    <strong>Measurements</strong>
    <table>
      <thead><tr><th>Key</th><th>Value</th></tr></thead>
      <tbody>
        ${(order.measurements && Object.keys(order.measurements).length>0) ? Object.entries(order.measurements).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('') : '<tr><td colspan="2">No measurements provided</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <strong>Payment</strong>
    <table>
      <tbody>
        <tr><td>Total</td><td>₹${order.totalAmount || 0}</td></tr>
        <tr><td>Advance</td><td>₹${order.advanceAmount || 0}</td></tr>
        <tr><td>Balance</td><td>₹${(order.totalAmount || 0) - (order.advanceAmount || 0)}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <strong>Design Notes</strong>
    <div>${order.designNotes || (order.design && order.design.description) || '—'}</div>
  </div>

  <footer style="margin-top:40px;font-size:12px;color:#666">This is a computer generated invoice from ${settings.companyName || 'SAPTHALA'}.</footer>
</body>
</html>`;
        return html;
    }

    // Generate and save both HTML and PDF files for an order, return URLs
    static async generateAndSavePDFFiles(order, settings, outDir = path.join(__dirname, '..', 'pdfs')) {
        try {
            if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
            const html = await this.generateOrderPDF(order, settings);
            const htmlPath = path.join(outDir, `${order.id || order.orderId}.html`);
            fs.writeFileSync(htmlPath, html);

            // Try to generate a real PDF using Puppeteer
            let pdfPath = null;
            try {
                const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0' });
                const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
                pdfPath = path.join(outDir, `${order.id || order.orderId}.pdf`);
                fs.writeFileSync(pdfPath, pdfBuffer);
                await browser.close();
            } catch (puppErr) {
                console.warn('Puppeteer PDF generation failed, falling back to HTML only:', puppErr.message);
            }

            return {
                success: true,
                htmlPath: `/pdfs/${order.id || order.orderId}.html`,
                pdfPath: pdfPath ? `/pdfs/${order.id || order.orderId}.pdf` : null
            };
        } catch (err) {
            console.error('Error generating/saving PDF files:', err);
            return { success: false, error: err.message };
        }
    }
}

module.exports = PDFService;
module.exports = PDFService;