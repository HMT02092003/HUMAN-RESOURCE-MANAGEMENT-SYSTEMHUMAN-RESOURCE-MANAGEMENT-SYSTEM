(async () => {
  try {
    const loginResp = await fetch('http://localhost:4001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456@' })
    });
    const loginJson = await loginResp.json();
    if (!loginJson || !loginJson.token) {
      console.error('Login failed:', loginJson);
      process.exit(2);
    }
    const token = loginJson.token;
    console.log('Got token, length:', token.length);

    const resp = await fetch('http://localhost:4001/api/users/check-scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ permissionKey: 'users' })
    });
    const j = await resp.json();
    console.log('\ncheck-scope response:');
    console.log(JSON.stringify(j, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(3);
  }
})();
