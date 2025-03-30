import mysql from "mysql2/promise";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const po_id = req.query.po_id;
  console.log("📬 API called with po_id:", po_id);

  if (!po_id) {
    return res.status(400).json({ success: false, error: "Missing po_id" });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DBHOST || "localhost",
      user: process.env.DBUSER || "your_user",
      password: process.env.DBPASS || "your_pass",
      database: process.env.DBNAME || "your_db",
      port: process.env.DBPORT ? parseInt(process.env.DBPORT) : 3306,
    });

    const [rows] = await db.execute(
      `SELECT item_id, po_id, is_read FROM manager_messages WHERE po_id = ? AND is_read = 0`,
      [po_id]
    );

    await db.end();

    return res.status(200).json({ success: true, messages: rows });
  } catch (err) {
    console.error("❌ DB Error in getManagerNotifications.js:", err.message);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
