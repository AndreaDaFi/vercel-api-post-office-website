import mysql from "mysql2/promise"

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end() // Preflight success
  }

  // GET request with customer ID as query parameter
  if (req.method === "GET") {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ success: false, error: "⚠ Missing customer ID." })
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

      const [messages] = await connection.execute(
        "SELECT * FROM customer_messages WHERE customers_id = ? AND is_deleted = 0",
        [id],
      )

      await connection.end()

      return res.status(200).json({ success: true, messages })
    } catch (error) {
      console.error("❌ API Error:", error.message)
      return res.status(500).json({ success: false, error: "Internal Server Error" })
    }
  }

  // PUT request to mark a message as read
  else if (req.method === "PUT") {
    try {
      const { customer_id, messageId } = req.body

      if (!customer_id || !messageId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: customer_id and messageId are required",
        })
      }

      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
        connectTimeout: 5000,
      })

      const [result] = await connection.execute(
        "UPDATE customer_messages SET is_read = 1 WHERE id = ? AND customers_id = ?",
        [messageId, customer_id],
      )

      await connection.end()

      return res.status(200).json({
        success: true,
        message: "Message marked as read",
        affectedRows: result.affectedRows,
      })
    } catch (error) {
      console.error("❌ API Error:", error.message)
      return res.status(500).json({ success: false, error: "Internal Server Error" })
    }
  }

  // Method not allowed
  else {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use GET or PUT." })
  }
}

