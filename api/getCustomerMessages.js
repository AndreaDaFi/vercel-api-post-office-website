export default async function handler(req, res) {
  // ✅ CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("Access-Control-Max-Age", "86400")

  // ✅ Respond to preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  // ✅ Grab customer_id from req.query (Next.js dynamic route)
  const { customer_id } = req.query
  if (!customer_id) {
    return res.status(400).json({ success: false, error: "Missing customer_id" })
  }

  if (req.method === "DELETE") {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
        connectTimeout: 5000,
      })

      const [result] = await connection.execute(
        "DELETE FROM customer_messages WHERE customer_id = ?",
        [customer_id]
      )
      await connection.end()

      return res.status(200).json({
        success: true,
        message: `${result.affectedRows} messages deleted.`,
        deletedCount: result.affectedRows,
      })
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
  }

  return res.status(405).json({ success: false, error: "Method Not Allowed" })
}
