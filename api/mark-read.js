import mysql from "mysql2/promise";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "PUT") return res.status(405).json({ success: false, error: "Method Not Allowed" });

  const { customerId } = req.body;

  if (!customerId || isNaN(parseInt(customerId))) {
    return res.status(400).json({ success: false, error: "Invalid customerId" });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    await db.execute(
      `UPDATE customer_messages SET message_read = 1 WHERE packages_customers_id = ?`,
      [customerId]
    );

    await db.end();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ mark-read error:", err);
    return res.status(500).json({ success: false, error: "Failed to mark messages as read" });
  }
}
