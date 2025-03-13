// api/testDB.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers to avoid content-type sniffing
  res.setHeader('x-content-type-options', 'nosniff');

  try {
    // Your existing database logic here
    console.log("⏳ Connecting to database...");
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA 
        ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
        : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    const [rows] = await connection.execute('SELECT * FROM state');
    await connection.end();

    console.log("✅ Query executed successfully!", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}