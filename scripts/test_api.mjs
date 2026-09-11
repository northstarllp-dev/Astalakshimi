// Real-OTP smoke test: sends an SMS via the configured provider, then verifies
// the code you received. Usage:
//   node scripts/test_api.mjs <phone> <otp-from-sms>
// If <otp-from-sms> is omitted, only the send step runs.
const phone = process.argv[2] || '9876543210';
const otp = process.argv[3];

const sendOtp = async () => {
  console.log('Sending OTP to', phone, '...');
  const res1 = await fetch('http://localhost:4000/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, consentAccepted: true })
  });
  const data1 = await res1.json();
  console.log('Send OTP Response:', res1.status, data1);
  if (res1.status !== 201) return;

  if (!otp) {
    console.log('SMS sent. Re-run with the code to verify: node scripts/test_api.mjs', phone, '<otp-from-sms>');
    return;
  }

  const res2 = await fetch('http://localhost:4000/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp })
  });
  const data2 = await res2.json();
  console.log('Verify OTP Response:', res2.status, {
    ...data2,
    accessToken: data2.accessToken ? '<redacted>' : undefined,
    refreshToken: data2.refreshToken ? '<redacted>' : undefined,
  });
};

sendOtp().catch(console.error);
