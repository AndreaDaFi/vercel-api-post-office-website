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
      host: "localhost",
      user: "your_user",
      password: "your_pass",
      database: "your_db",
    })

    const [rows] = await db.execute(
      `SELECT packages_tracking_number, message_read 
       FROM customer_messages 
       WHERE packages_customers_id = ? AND message_read = 0`,
      [customerId]
    )

    await db.end()

    return res.status(200).json({ success: true, messages: rows })
  } catch (err) {
    console.error("DB error:", err)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
