import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

export async function createConnection() {
  const connection = await mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }).getConnection();
  console.log("Connected to MariaDB.");
  return connection;
}
