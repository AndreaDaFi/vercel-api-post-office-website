import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs'; // Use bcryptjs for password security

export default async function handler(req, res) {
  // Set security headers & CORS policy
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { email, password } = req.body;

  // Validate inputs
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "⚠ Email and password are required." });
  }

  let connection;
  try {
    console.log("⏳ Connecting to database...");
    connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    // Fetch user by email
    const [rows] = await connection.execute(
      "SELECT email, password FROM EMPLOYEES WHERE email = ?",
      [email]
    );

    await connection.end();
    console.log("✅ Query executed:", rows);

    if (rows.length === 0) {
      console.log("⚠ No user found for email:", email);
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    const user = rows[0];

    // 🔹 If passwords are hashed in DB, use bcrypt to compare
    // const isValidPassword = await bcrypt.compare(password, user.password);
    const isSamePasswor = password === user.password
    if (!isSamePasswor) {
      console.log("❌ Password mismatch for:", email);
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    console.log("✅ Login successful for:", email);
    res.status(200).json({ success: true, message: "🎉 Login successful!" });

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
