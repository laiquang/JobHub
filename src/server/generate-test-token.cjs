
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.test' });

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Chỉ được chạy trong môi trường test');
}

if (process.env.DB_NAME !== 'jobyfy_test') {
  throw new Error('Database phải là jobyfy_test');
}

const companyId = Number(process.argv[2]);

if (!Number.isSafeInteger(companyId) || companyId <= 0) {
  throw new Error('Vui lòng nhập ID công ty test hợp lệ');
}

if (!process.env.JWT_SECRET) {
  throw new Error('Chưa cấu hình JWT_SECRET');
}

const token = jwt.sign(
  {
    id: companyId,
    email: 'jobyfy-test@example.invalid',
    userType: 'company'
  },
  process.env.JWT_SECRET,
  { expiresIn: '30m' }
);

console.log('\nTEST JWT:\n');
console.log(token);
