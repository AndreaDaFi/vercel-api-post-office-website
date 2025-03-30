import mysql from "mysql2/promise"

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()

  const customerId = req.query.customerId

  if (!customerId) {
    return res.status(400).json({ success: false, error: "customerId is required" })
  }

  try {
    const db = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
    });
    console.log("DATABASE CONNECTED");

    const [rows] = await db.execute(
      `SELECT msg.packages_tracking_number, ao.state_id AS 'origin_state',
CONCAT(ad.street, ad.street2, ad.apt, ', ', ad.city_name, ' ', ad.state_id, ' ', ad.zip) AS 'destination_address'
FROM customer_messages AS msg, address AS ao, address AS ad
WHERE msg.packages_customers_id=? AND ao.address_id=msg.packages_origin_address_id AND
ad.address_id=packages_destination_address_id AND message_read=0`,
      [customerId]
    )

    await db.end()

    return res.status(200).json({ success: true, messages: rows })
  } catch (err) {
    console.error("DB error:", err)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
