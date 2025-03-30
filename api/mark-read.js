import mysql from "mysql2/promise"

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" })
  }

  const { customerId } = req.body

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

    const [result] = await db.execute(
      `UPDATE customer_messages 
       SET message_read = 1 
       WHERE packages_customers_id = ? AND message_read = 0`,
      [customerId]
    )

    await db.end()

    return res.status(200).json({ success: true, updated: result.affectedRows })
  } catch (err) {
    console.error("❌ DB Error:", err)
    return res.status(500).json({ success: false, message: "Internal server error" })
  }
}
