
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

dotenv.config({ path: envFile });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jobify_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

export const testConnection = async (): Promise<void> => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT DATABASE() AS database_name'
    );

    console.log('✅ Kết nối MySQL thành công!');
    console.log('📦 Database đang sử dụng:', rows);

    connection.release();
  } catch (error) {
    console.error('❌ Lỗi kết nối MySQL:', error);
    throw error;
  }
};

export default pool;
