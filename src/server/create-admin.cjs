
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const readline = require('node:readline/promises');

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let connection;

  try {
    const fullName = (await rl.question('Ho ten Admin: ')).trim();
    const email = (await rl.question('Email Admin: ')).trim().toLowerCase();
    const password = await rl.question('Mat khau Admin (toi thieu 12 ky tu): ');

    if (!fullName || !email.includes('@') || password.length < 12) {
      throw new Error('Thong tin khong hop le. Mat khau phai co it nhat 12 ky tu.');
    }

    const dbName = process.env.DB_NAME || process.env.DB_DATABASE;

    if (dbName !== 'jobyfy') {
      throw new Error(
        `Database hien tai la "${dbName}". Chi cho phep tao Admin tren jobyfy.`
      );
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: dbName
    });

    const [existingAdmins] = await connection.execute(
      'SELECT id FROM admins WHERE role = ? LIMIT 1',
      ['SUPER_ADMIN']
    );

    if (existingAdmins.length > 0) {
      throw new Error('Da ton tai SUPER_ADMIN. Khong tao them bang script nay.');
    }

    const hash = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO admins
       (full_name, email, password, role, status)
       VALUES (?, ?, ?, 'SUPER_ADMIN', 'ACTIVE')`,
      [fullName, email, hash]
    );

    console.log('\nTao tai khoan SUPER_ADMIN thanh cong!');
    console.log(`Email: ${email}`);
  } catch (error) {
    console.error('\nLoi:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
    rl.close();
  }
}

main();
