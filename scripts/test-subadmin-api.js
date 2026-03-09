const fetch = require('node-fetch');

(async () => {
  try {
    const login = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'sapthala@2029' })
    });
    const jl = await login.json();
    const token = jl.token;
    console.log('token?', !!token);
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

    const payload = { username: 'e2e_subadmin', password: 'subadmin@123', branch: 'E2E TEST' };
    const create = await fetch('http://localhost:3000/api/admin/sub-admins', { method: 'POST', headers, body: JSON.stringify(payload) });
    const c = await create.json();
    console.log('create', create.status, c);

    const list = await fetch('http://localhost:3000/api/admin/sub-admins', { headers });
    console.log('list status', list.status, await list.json());

    if (c && c.subAdmin && c.subAdmin.id) {
      const del = await fetch('http://localhost:3000/api/admin/sub-admins/' + c.subAdmin.id, { method: 'DELETE', headers });
      console.log('deleted', del.status, await del.json());
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();