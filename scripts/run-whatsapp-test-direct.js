const axios = require('axios');
const fs = require('fs');

(async () => {
  const payload = {
    phone: process.env.TEST_PHONE || '+919876543210',
    message: 'Direct test (node script) - SAPTHALA',
    pdfUrl: null
  };

  try {
    const res = await axios.post('http://127.0.0.1:3000/api/send-whatsapp', payload, { timeout: 8000 });
    const out = { status: res.status, data: res.data };
    fs.writeFileSync('whatsapp_direct_response.json', JSON.stringify(out, null, 2));
    console.log('OK - wrote whatsapp_direct_response.json');
  } catch (err) {
    const errMsg = err && err.response ? { status: err.response.status, data: err.response.data } : { message: err.message };
    fs.writeFileSync('whatsapp_direct_response.json', JSON.stringify({ error: errMsg }, null, 2));
    console.error('ERROR - wrote whatsapp_direct_response.json', errMsg);
    process.exit(1);
  }
})();