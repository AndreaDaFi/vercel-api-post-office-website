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
      `SELECT p.tracking_number, p.status, p.weight, p.receiver_name, p.type,
	CASE
        WHEN p.type IS NULL THEN (
            SELECT GROUP_CONCAT(CONCAT(i.item_name, ': ', ip.item_amount_purchased) SEPARATOR ', ')
            FROM item_purchased ip
            JOIN items_for_sale i ON i.item_id = ip.item_id
            JOIN transactions t ON t.transactions_id = ip.transactions_id
            WHERE t.packages_tracking_number = p.tracking_number
            GROUP BY t.packages_tracking_number
        )
        ELSE NULL
    END AS 'store_order_items',
    CASE
        WHEN p.fast_delivery = 1 THEN DATE_ADD(t.transaction_date, INTERVAL 1 DAY)
        ELSE DATE_ADD(t.transaction_date, INTERVAL 10 DAY)
    END AS 'estimated_delivery'
FROM packages AS p
JOIN transactions AS t ON t.packages_tracking_number = p.tracking_number
WHERE customers_id = ?;`,
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
