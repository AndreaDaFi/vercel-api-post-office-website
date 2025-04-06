import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set security headers & CORS policy
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { email } = req.query;

  // Validate inputs
  if (!email ) {
    return res.status(400).json({ success: false, error: "⚠ Email is required." });
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
      "SELECT * FROM customers WHERE email = ? AND is_active = 1",
      [email]
    );

    await connection.end();
    console.log("✅ Query executed:", rows);

    if (rows.length === 0) {
      console.log("⚠ No user found for email:", email);
      return res.status(400).json({ success: false, error: "⚠ Invalid email." });
    }
    else {
        console.log("User exists with this email");
        const user = rows[0];
        return res.status(200).json({ success: true, user: user, message: "User exists with this email" });
    }

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
