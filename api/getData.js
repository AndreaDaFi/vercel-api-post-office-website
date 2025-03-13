import mysql from 'mysql2/promise';

const sslCA = Buffer.from(process.env.DB_SSL_CA, 'base64');

export default async function handler(req, res) {
  try {
    console.log("⏳ Connecting to database...");

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: {
        ca: sslCA,
        rejectUnauthorized: false, // Accept self-signed certificates
      },
      connectTimeout: 5000, // Set timeout to 5 seconds
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
