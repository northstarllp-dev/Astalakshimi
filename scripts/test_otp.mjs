import crypto from 'node:crypto';

const mockEnabled = true;
const defaultMockOtp = '123456';
const otp = mockEnabled ? defaultMockOtp : Math.floor(100000 + Math.random() * 900000).toString();
const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
console.log('generated hash:', hashedOtp);

const inputOtp = '123456';
const hashedInput = crypto.createHash('sha256').update(inputOtp).digest('hex');
console.log('input hash:', hashedInput);

console.log('match:', hashedOtp === hashedInput);
