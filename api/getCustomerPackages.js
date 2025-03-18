import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    }

    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, error: "⚠ Missing customer ID." });
    }

    console.log(`🔍 Searching for packages for customer ID: ${customer_id}`);

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    // ✅ Select only existing columns
    const [packages] = await connection.execute(
      "SELECT tracking_number, status, weight, receiver_name, type FROM packages WHERE customers_id = ?",
      [customer_id]
    );

    await connection.end();
    console.log(`📦 Packages found: ${packages.length}`);

    return res.status(200).json({ success: true, packages });

  } catch (error) {
    console.error("❌ API Error:", error.message);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
