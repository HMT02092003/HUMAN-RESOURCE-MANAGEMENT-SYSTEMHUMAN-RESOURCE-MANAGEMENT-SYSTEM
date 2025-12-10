(async () => {
  try {
    const loginResp = await fetch('http://localhost:4001/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: '123456@' })
    });
    const loginJson = await loginResp.json();
    const token = loginJson.token;
    console.log('Token length:', token.length);

    const AUTH_URL = 'http://192.168.1.6:4001/api/users/check-scope';
    console.log('Calling', AUTH_URL);
    const resp = await fetch(AUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ permissionKey: 'users' }) });
    const j = await resp.json();
    console.log('Response from IP-based auth-service:');
    console.log(JSON.stringify(j, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Err', err);
    process.exit(3);
  }
})();
