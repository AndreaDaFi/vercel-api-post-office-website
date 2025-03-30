import mysql from "mysql2/promise";

export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "https://apipost.vercel.app"); // or "*" in dev
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ✅ Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { item_id, newStock, po_id } = req.body;

  if (!item_id || !newStock || !po_id) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA
        ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") }
        : false,
      connectTimeout: 5000,
    });

    // ✅ Run stock update for the correct post office and item
    const [result] = await connection.execute(
      `UPDATE items_for_sale SET stock = ? WHERE item_id = ? AND po_id = ?`,
      [newStock, item_id, po_id]
    );

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Item not found or doesn't belong to this location." });
    }

    return res.status(200).json({ success: true, message: "Stock updated successfully" });
  } catch (err) {
    console.error("❌ UpdateStock API Error:", err);
    return res.status(500).json({ success: false, error: "Internal server Error" });
  }
}
