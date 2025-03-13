export default async function handler(req, res) {
  // Set custom headers to avoid content-type sniffing
  res.setHeader('x-content-type-options', 'nosniff');

  // Add CORS headers to allow requests from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');  // Or specify your frontend URL here for security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
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
