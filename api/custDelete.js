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

  const { customers_id } = req.body;

  // Validate customers_id input
  if (!customers_id) {
    return res.status(400).json({ success: false, error: "⚠ Customer ID is required." });
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

    // Fetch user by customers_id
    const [rows] = await connection.execute(
      "SELECT * FROM customers WHERE customers_id = ? AND is_active = 1",
      [customers_id]
    );

    if (rows.length === 0) {
      console.log("⚠ No active user found for customers_id:", customers_id);
      return res.status(400).json({ success: false, error: "⚠ Invalid customer ID or the account is already inactive." });
    }

    const user = rows[0];
    console.log("Found user for customers_id:", customers_id);

    // Update user's is_active to 0 to "delete" the account
    const [updateResult] = await connection.execute(
      "UPDATE customers SET is_active = 0 WHERE customers_id = ?",
      [customers_id]
    );

    if (updateResult.affectedRows === 0) {
      console.log("❌ Failed to deactivate account for customers_id:", customers_id);
      return res.status(500).json({ success: false, error: "⚠ Failed to deactivate the account." });
    }

    console.log("✅ Account deactivated for customers_id:", customers_id);

    // Return success message
    res.status(200).json({ success: true, message: "🎉 Account successfully deactivated." });

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}
