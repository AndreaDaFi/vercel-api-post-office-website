import mysql from "mysql2/promise"

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Max-Age", "86400") // cache for 24h

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  // Get customer_id from query param
  const { customer_id } = req.query

  if (!customer_id) {
    return res.status(400).json({ success: false, error: "Missing customer ID" })
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
      connectTimeout: 5000,
    })

    if (req.method === "GET") {
      const [messages] = await connection.execute(
        `SELECT m.id, m.message, m.created_at, m.is_read, m.customer_id, m.package_id,
                p.tracking_number, p.status,
                COALESCE(oa.state, 'Unknown') as origin_state,
                COALESCE(CONCAT(da.address, ', ', da.city, ' ', da.state, ' ', da.zip), 'Unknown') as destination_address
         FROM customer_messages m
         LEFT JOIN packages p ON m.package_id = p.id
         LEFT JOIN addresses oa ON p.packages_origin_address_id = oa.id
         LEFT JOIN addresses da ON p.packages_destination_address_id = da.id
         WHERE m.customer_id = ? AND m.is_deleted = 0 AND m.is_read = 0
         ORDER BY m.created_at DESC`,
        [customer_id]
      )

      await connection.end()
      return res.status(200).json({ success: true, messages })
    }

    if (req.method === "DELETE") {
      const [result] = await connection.execute(
        `DELETE FROM customer_messages WHERE customer_id = ?`,
        [customer_id]
      )

      await connection.end()
      return res.status(200).json({
        success: true,
        message: `${result.affectedRows} messages deleted.`,
        deletedCount: result.affectedRows,
      })
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" })
  } catch (err) {
    console.error("❌ DB Error:", err)
    return res.status(500).json({ success: false, error: "Internal Server Error" })
  }
}
