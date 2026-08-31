const run = async () => {
  const phone = '9876543210';
  
  // 1. Hit Next.js proxy for send-otp
  console.log('Sending OTP via proxy...');
  const res1 = await fetch('http://localhost:3000/api/proxy/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, consentAccepted: true })
  });
  console.log('Send OTP Proxy Response:', res1.status, await res1.json());

  // 2. Hit Next.js API for login (verify-otp)
  console.log('Verifying OTP via Next.js API...');
  const res2 = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' })
  });
  
  console.log('Verify OTP API Response:', res2.status, res2.headers.get('set-cookie'), await res2.json());
};

run().catch(console.error);
