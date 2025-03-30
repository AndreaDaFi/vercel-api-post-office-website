import mysql from "mysql2/promise"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" })
  }

  const { customerId } = req.query

  if (!customerId) {
    return res.status(400).json({ success: false, message: "Missing customerId" })
  }

  try {
    const db = await mysql.createConnection({
      host: "localhost",      // 🔁 change for production
      user: "your_user",
      password: "your_pass",
      database: "your_db",
    })

    const [messages] = await db.execute(
      `SELECT packages_tracking_number, message_read 
       FROM customer_messages 
       WHERE packages_customers_id = ? AND message_read = 0`,
      [customerId]
    )

    await db.end()

    return res.status(200).json({ success: true, messages })
  } catch (err) {
    console.error("DB error:", err)
    return res.status(500).json({ success: false, message: "Internal server error" })
  }
}
