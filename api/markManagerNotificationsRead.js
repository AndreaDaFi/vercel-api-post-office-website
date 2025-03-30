import mysql from "mysql2/promise";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { po_id } = req.body;

  if (!po_id) {
    return res.status(400).json({ success: false, message: "Missing po_id" });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA
        ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
        : false,
      connectTimeout: 5000,
    });

    const [result] = await db.execute(
      `UPDATE manager_messages 
       SET is_read = 1 
       WHERE po_id = ? AND is_read = 0`,
      [po_id]
    );

    await db.end();

    return res.status(200).json({ success: true, updated: result.affectedRows });
  } catch (err) {
    console.error("❌ DB Error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
