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

    // Enhanced query to include origin and destination addresses
    const [packages] = await connection.execute(
      `SELECT p.tracking_number, p.status, p.weight, p.receiver_name, p.type,
              oa.address as origin_address, oa.city as origin_city, oa.state as origin_state,
              da.address as destination_address, da.city as destination_city, da.state as destination_state
       FROM packages p
       LEFT JOIN addresses oa ON p.packages_origin_address_id = oa.id
       LEFT JOIN addresses da ON p.packages_destination_address_id = da.id
       WHERE p.customers_id = ?`,
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