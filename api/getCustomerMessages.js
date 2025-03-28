import mysql from "mysql2/promise";

export default async function handler(req, res) {
  // ✅ Set CORS headers for ALL responses (must be before anything else!)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  // ✅ Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(204).end(); // No content
  }

  // 🔄 Get customer_id from either query param or body
  let customer_id;
  if (req.method === "GET") {
    const pathParts = req.url.split("/");
    customer_id = pathParts[pathParts.length - 1];
  } else if (req.body?.customer_id) {
    customer_id = req.body.customer_id;
  } else {
    const pathParts = req.url.split("/");
    customer_id = pathParts[pathParts.length - 1];
  }

  if (!customer_id) {
    return res.status(400).json({ success: false, error: "Missing customer ID." });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
    });

    if (req.method === "GET" || req.method === "POST") {
      const [messages] = await connection.execute(
        `SELECT m.id, m.message, m.created_at, m.is_read, m.customer_id, m.package_id,
                p.tracking_number, p.status,
                COALESCE(oa.state, 'Unknown') as origin_state,
                COALESCE(CONCAT(da.address, ', ', da.city, ' ', da.state, ' ', da.zip), 'Unknown') as destination_address
         FROM customer_messages m
         LEFT JOIN packages p ON m.package_id = p.id
         LEFT JOIN addresses oa ON p.packages_origin_address_id = oa.id
         LEFT JOIN addresses da ON p.packages_destination_address_id = da.id
         WHERE m.customer_id = ? AND m.is_read = 0 AND m.is_deleted = 0
         ORDER BY m.created_at DESC`,
        [customer_id]
      );

      await connection.end();
      return res.status(200).json({ success: true, messages });
    }

    if (req.method === "DELETE") {
      const [deleted] = await connection.execute(
        `DELETE FROM customer_messages WHERE customer_id = ?`,
        [customer_id]
      );
      await connection.end();

      return res.status(200).json({
        success: true,
        message: `${deleted.affectedRows} messages permanently deleted.`,
        deletedCount: deleted.affectedRows,
      });
    }

    // If method not supported
    await connection.end();
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
