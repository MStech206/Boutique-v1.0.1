(async ()=>{
  const staff = {
    staffId: 'staff_e2e_1',
    name: 'E2E Tailor',
    phone: '+919000000001',
    email: 'e2e.staff@test',
    role: 'tailor',
    pin: '1234',
    branch: 'SAPTHALA.E2ETEST',
    workflowStages: ['dyeing','cutting','stitching','finishing','quality-check']
  };

  try{
    const res = await fetch('http://localhost:3000/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(staff) });
    const body = await res.text();
    console.log('status', res.status);
    console.log(body);
  }catch(err){
    console.error('error', err.message);
    process.exit(1);
  }
})();
