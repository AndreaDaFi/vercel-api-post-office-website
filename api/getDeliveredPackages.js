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

    console.log(`📦 Fetching delivered packages for Customer ID: ${customer_id}`);

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    // Fetch delivered packages with receiver's full address
    const [deliveredPackages] = await connection.execute(
      `SELECT 
          p.tracking_number, 
          p.receiver_name, 
          a.street AS destination_street, 
          a.city_name AS destination_city,  
          a.state_id AS destination_state,  
          a.zip AS destination_zip
      FROM packages p
      JOIN address a ON p.destination_address_id = a.address_id
      WHERE p.customers_id = ? AND p.status = 'Delivered'`,
      [customer_id]
    );

    await connection.end();
    console.log("✅ Delivered Packages Retrieved:", deliveredPackages);

    return res.status(200).json({ success: true, packages: deliveredPackages });

  } catch (error) {
    console.error("❌ API Error:", error.message);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
