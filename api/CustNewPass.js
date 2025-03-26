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

  const { email, secAnswer, newPass } = req.body;

  // Validate inputs
  if (!secAnswer || !newPass ) {
    return res.status(400).json({ success: false, error: "⚠ Answer and password is required." });
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
      "SELECT * FROM customers WHERE email = ? AND security_answer=?",
      [email, secAnswer]
    );

    if (rows.length ===0){
        return res.status(400).json({ success: false, error: "⚠ Security answer does not match" });
    }

    await connection.execute(
        "UPDATE customers SET password = ? WHERE email = ?",
        [newPass, email]
    );

    await connection.end();
    console.log("password updated successfully");
    return res.status(200).json({ success: true, message: "Password updated successfully" });


  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
