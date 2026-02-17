const axios = require('axios');

(async () => {
  try {
    const res = await axios.post('http://127.0.0.1:3000/api/admin/login', { username: 'admin', password: 'sapthala@2029' }, { validateStatus: () => true, timeout: 5000 });
    console.log('STATUS', res.status);
    console.log('DATA', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('ERROR', err.message || err);
    if (err.response) console.error('RESP:', err.response.status, err.response.data);
  }
})();