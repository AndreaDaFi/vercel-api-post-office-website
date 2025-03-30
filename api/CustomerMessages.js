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
      host: "localhost", // cambia esto si estás en producción
      user: "your_user",
      password: "your_password",
      database: "your_database",
    })

    // Solo mensajes no leídos (opc)
    const [messages] = await db.execute(
      `SELECT packages_tracking_number, message_read
       FROM customer_messages
       WHERE packages_customers_id = ?`,
      [customerId]
    )

    await db.end()

    return res.status(200).json({ success: true, messages })
  } catch (err) {
    console.error("❌ DB Error:", err)
    return res.status(500).json({ success: false, message: "Internal server error" })
  }
}
