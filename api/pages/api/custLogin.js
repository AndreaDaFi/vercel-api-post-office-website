import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Set CORS headers to allow frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // ✅ Preflight response
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "⚠ Email and password are required." });
  }

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

    // ✅ Fetch user from MySQL
    const [rows] = await connection.execute(
      `SELECT email, password FROM customers WHERE email = ?`,
      [email]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    const user = rows[0];

    // ✅ Check if the password matches
    if (user.password !== password) {
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    console.log("✅ Login successful for:", email);
    res.status(200).json({ success: true, message: "🎉 Login successful!", user: { email: user.email } });

  } catch (error) {
    console.error("❌ API Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}
