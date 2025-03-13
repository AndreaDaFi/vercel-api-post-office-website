import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');  // You can replace '*' with your actual frontend URL for better security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    const [rows] = await connection.execute('SELECT state_name FROM state');
    await connection.end();

    console.log("✅ Query executed successfully!", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}