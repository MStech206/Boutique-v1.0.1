(async () => {
  try {
    const base = 'http://localhost:3001/api';
    console.log('Posting login...');
    const loginResp = await fetch(base + '/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '1234' })
    });
    const loginJson = await loginResp.text();
    console.log('\n/login response:');
    console.log(loginJson);

    let token = null;
    try { token = JSON.parse(loginJson).token; } catch (e) { }

    console.log('\nCalling /admin/customers (auth) ...');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const adminCust = await fetch(base + '/admin/customers', { headers });
    const adminCustText = await adminCust.text();
    console.log('/admin/customers response code:', adminCust.status);
    console.log(adminCustText);

    console.log('\nCalling /public/branches ...');
    const branches = await fetch(base + '/public/branches');
    console.log('/public/branches status:', branches.status);
    console.log(await branches.text());

    console.log('\nCalling /festivals ...');
    const festivals = await fetch(base + '/festivals');
    console.log('/festivals status:', festivals.status);
    console.log(await festivals.text());

  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
