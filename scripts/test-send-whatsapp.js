const axios = require('axios');

(async () => {
  const payload = {
    phone: process.env.TEST_PHONE || '+919876543210',
    message: 'Test message from SAPTHALA automated test. This is a test (no important action).',
    pdfUrl: null
  };

  try {
    const res = await axios.post('http://localhost:3000/api/send-whatsapp', payload, { validateStatus: () => true });
    console.log('Status:', res.status);
    console.log('Response:', res.data);
    if (res.data && res.data.sentVia === 'twilio') {
      console.log('✅ Twilio send succeeded. SID:', res.data.sid);
    } else if (res.data && res.data.whatsappUrl) {
      console.log('ℹ️ wa.me link returned:', res.data.whatsappUrl);
    }
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();