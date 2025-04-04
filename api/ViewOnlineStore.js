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
        `SELECT p.tracking_number, p.status, ifs.item_category, t.transaction_date, ifs.item_name, item_price, ip.item_amount_purchased, ifs.item_id,
       (SELECT status_update_datetime 
        FROM employees_updates_to_packages eutp
        WHERE eutp.tracking_number = p.tracking_number
          AND eutp.updated_status = 'Delivered'
        ORDER BY eutp.status_update_datetime ASC
        LIMIT 1) AS delivery_date,
CONCAT(ifs.po_id, ' - ', pa.street, ' ', pa.city_name, ', ', pa.state_id) AS 'origin_post_office', ad.state_id AS 'destination_state', ad.city_name AS 'destination_city', 
purchased_insurance, fast_delivery, total_amount, ROUND(total_tax, 2) AS 'total_tax'
FROM packages AS p
JOIN transactions AS t ON p.po_id = t.po_id
JOIN address AS ao ON ao.address_id = p.origin_address_id
JOIN address AS ad ON ad.address_id = p.destination_address_id
JOIN item_purchased AS ip ON ip.transactions_id = t.transactions_id
JOIN items_for_sale AS ifs ON ifs.item_id=ip.item_id
JOIN post_office AS po ON ifs.po_id=po.po_id
JOIN address AS pa ON pa.address_id = po.po_address_id
WHERE p.po_id = ?
  AND p.type IS NULL
  AND p.tracking_number = t.packages_tracking_number;`, [po_id]
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