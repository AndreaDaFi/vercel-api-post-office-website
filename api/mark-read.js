import mysql from "mysql2/promise";

export default async function handler(req, res) {
  // CORS headers for preflight
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or your frontend URL for better security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Respond to preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle the PUT request
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ success: false, message: "Missing customerId" });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA
        ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
        : false,
      connectTimeout: 5000,
    });

    const [result] = await db.execute(
      `UPDATE customer_messages 
       SET message_read = 1 
       WHERE packages_customers_id = ? AND message_read = 0`,
      [customerId]
    );

    await db.end();

    return res.status(200).json({ success: true, updated: result.affectedRows });
  } catch (err) {
    console.error("❌ DB Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
