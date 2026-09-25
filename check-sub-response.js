const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/payments/subscription',
  method: 'GET',
  headers: {
    'Cookie': 'session=maha-dummy-session' // Assuming we don't need real auth or we can use the local DB query instead
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});

req.on('error', console.error);
req.end();
