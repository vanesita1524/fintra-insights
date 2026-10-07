import pool from "./db.js";

try {
  const [rows] = await pool.query("SELECT 1 AS conectado");

  console.log("✅ Conexión a TiDB exitosa:");
  console.log(rows);

  await pool.end();
} catch (error) {
  console.error("❌ Error conectando a TiDB:");
  console.error(error.message);
}