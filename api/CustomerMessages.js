import mysql from "mysql2/promise";

export default async function handler(req, res) {
  // Enable CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const { customerId } = req.query;

    if (!customerId) {
      return res.status(400).json({ success: false, error: "customerId is required" });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    // 📨 Traer solo mensajes no leídos
    const [messages] = await connection.execute(
      `
      SELECT
        m.packages_tracking_number,
        m.packages_origin_address_id,
        m.packages_destination_address_id,
        a1.state_id AS origin_state,
        CONCAT(a2.street, ', ', a2.city_name, ' ', a2.zip) AS destination_address
      FROM customer_messages m
      JOIN address a1 ON m.packages_origin_address_id = a1.address_id
      JOIN address a2 ON m.packages_destination_address_id = a2.address_id
      WHERE m.packages_customers_id = ? AND m.message_read = 0
    `,
      [customerId]
    );

    await connection.end();

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error in CustomerMessages API:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
