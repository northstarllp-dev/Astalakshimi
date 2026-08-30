async function test() {
  try {
    // 1. Send OTP
    const sendRes = await fetch('http://localhost:4000/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '7604879949', consentAccepted: true })
    });
    console.log('Send OTP:', sendRes.status);
    
    // 2. Verify OTP
    const verifyRes = await fetch('http://localhost:4000/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '7604879949', otp: '123456' })
    });
    console.log('Verify OTP:', verifyRes.status);
    const verifyData = await verifyRes.json();
    const token = verifyData.accessToken;
    if (!token) {
      console.error('No token received');
      return;
    }

    // 3. Call confirmVerification
    const confirmRes = await fetch('http://localhost:4000/api/media/confirm-verification', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        method: 'selfie',
        selfieS3Key: 'verifications/test-key.jpg',
        govtIdType: '',
        govtIdS3Key: ''
      })
    });
    console.log('Confirm Verification:', confirmRes.status);
    const text = await confirmRes.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
