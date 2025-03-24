import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Set CORS headers to allow frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // ✅ Preflight response
  }

  if (req.method === 'GET') {
    const { po_id } = req.query;

    try {
      console.log("⏳ Connecting to database...");
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA 
          ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
          : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      const [rows] = await connection.execute(
        `SELECT p.tracking_number, p.type, p.weight, p.size, p.status, t.transaction_date, 
        ao.state_id AS 'origin_state',ao.city_name AS 'origin_city',
        ad.state_id AS 'destination_state', ad.city_name AS 'destination_city',
        purchased_insurance, fast_delivery, fragile, total_amount, ROUND(total_tax,2) AS 'total_tax'
FROM packages AS p 
JOIN transactions AS t ON p.po_id=t.po_id 
JOIN address AS ao ON ao.address_id=origin_address_id 
JOIN address as ad ON ad.address_id=destination_address_id 
WHERE p.po_id = ? 
AND p.type IS NOT NULL
AND p.tracking_number=t.packages_tracking_number`, [po_id]
      );

      await connection.end();
      console.log("✅ Query executed successfully!", rows);

      res.status(200).json({ success: true, data: rows });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}