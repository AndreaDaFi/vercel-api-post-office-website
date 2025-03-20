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
      "SELECT * FROM customers WHERE email = ?",
      [email]
    );

    await connection.end();
    console.log("✅ Query executed:", rows);

    if (rows.length === 0) {
      console.log("⚠ No user found for email:", email);
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    const user = rows[0];
    console.log("passwords to compare:", password, "and", user.password);

    // 🔹 If passwords are hashed in DB, use bcrypt to compare
    // const isValidPassword = await bcrypt.compare(password, user.password);
    const isValidPassword = password === user.password

    if (!isValidPassword) {
      console.log("❌ Password mismatch for:", email);
      return res.status(400).json({ success: false, error: "⚠ Invalid email or password." });
    }

    console.log("✅ Login successful for:", email);

    //returns all of the customer's data once they're logged in
    //THIS IS IMPORTANT because if we don't return the data,
    //we cant work on other customer pages
    const { password: _, ...userWithoutPassword } = user;
    //return the row of data without the password
    res.status(200).json({ success: true, user: userWithoutPassword, message: "🎉 Login successful!" });

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
