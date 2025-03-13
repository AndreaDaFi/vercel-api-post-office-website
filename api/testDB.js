import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    console.log("⏳ Connecting to database...");

    const connection = await mysql.createConnection({
      host: process.env.DBHOST, // FIXED: Match .env variable names
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA 
        ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
        : false, // FIXED: Only apply SSL if it's provided
      connectTimeout: 5000, // Reduce connection timeout
    });

    console.log("✅ Database connected!");

    const [rows] = await connection.execute('SELECT * FROM state LIMIT 10'); // FIXED: Add LIMIT to prevent slow query
    await connection.end();

    console.log("✅ Query executed successfully!", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}