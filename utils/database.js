import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Create a single connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

console.log("MariaDB connection pool created.");

export async function getConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection acquired.");
    return connection;
  } catch (error) {
    console.error("Error acquiring database connection:", error);
    throw error;
  }
}
