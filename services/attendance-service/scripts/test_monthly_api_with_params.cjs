(async () => {
  try {
    // Login to auth-service
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

    // Call attendance-service monthly-summaries-by-scope with sort & filters
    // Test cases: sort by fullName (in-memory sort), username, and month (DB sort)
    const query = new URLSearchParams({
      permissionKey: 'users',
      page: '1',
      pageSize: '10',
      sort: 'fullName',
      order: 'asc',
      fullName: 'a'
    }).toString();

    const url = `http://localhost:4003/api/monthly-summaries-by-scope?${query}`;
    console.log('Request URL:', url);
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json();
    console.log('\nAttendance API response:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error in test script:', err);
    process.exit(3);
  }
})();
