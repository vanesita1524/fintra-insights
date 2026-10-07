import mysql from "mysql2/promise";
import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: Number(process.env.TIDB_PORT),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    rejectUnauthorized: true,
  },
  waitForConnections: true,
  connectionLimit: 5,
});

export default pool;