const sendOtp = async () => {
  const phone = '9876543210';
  
  console.log('Sending OTP...');
  const res1 = await fetch('http://localhost:4000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, consentAccepted: true })
  });
  const data1 = await res1.json();
  console.log('Send OTP Response:', res1.status, data1);

  if (res1.status !== 201) return;

  const mockOtp = data1.mockOtp || '123456';
  console.log('Verifying OTP with:', mockOtp);

  const res2 = await fetch('http://localhost:4000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: mockOtp })
  });
  const data2 = await res2.json();
  console.log('Verify OTP Response:', res2.status, data2);
};

sendOtp().catch(console.error);
