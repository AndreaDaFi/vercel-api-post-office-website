import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://post-office-website.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
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
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    // 🔹 Get user with email
    const [rows] = await connection.execute(
      "SELECT email, password FROM customers WHERE email = ?",
      [email]
    );

    await connection.end();
    console.log("✅ Database connection closed.");

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    const user = rows[0];

    // 🔹 Compare passwords (Plaintext - only if passwords are not hashed)
    if (user.password !== password) {
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    console.log("✅ Login successful for:", email);
    res.status(200).json({ success: true, message: "🎉 Login successful!" });

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
