import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Respond to preflight request
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ✅ MySQL connection
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    // 🔹 GET → fetch unread messages for a customer
    if (req.method === 'GET') {
      const { id } = req.query;

      if (!id) return res.status(400).json({ success: false, error: 'Missing customer ID' });

      const [messages] = await connection.execute(
        `SELECT * FROM customer_messages 
         WHERE packages_customers_id = ? AND message_read = 0`,
        [id]
      );

      await connection.end();
      return res.status(200).json({ success: true, messages });
    }

    // 🔹 PUT → mark a message as read
    else if (req.method === 'PUT') {
      const { customer_id, tracking_number } = req.body;

      if (!customer_id || !tracking_number) {
        return res.status(400).json({
          success: false,
          error: 'Missing fields: customer_id and tracking_number required',
        });
      }

      const [result] = await connection.execute(
        `UPDATE customer_messages
         SET message_read = 1
         WHERE packages_customers_id = ? AND packages_tracking_number = ?`,
        [customer_id, tracking_number]
      );

      await connection.end();

      return res.status(200).json({
        success: true,
        message: 'Message marked as read',
        affectedRows: result.affectedRows,
      });
    }

    // 🔹 DELETE → delete all messages for a customer (optional debug)
    else if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) return res.status(400).json({ success: false, error: 'Missing customer ID in query param' });

      const [result] = await connection.execute(
        `DELETE FROM customer_messages WHERE packages_customers_id = ?`,
        [id]
      );

      await connection.end();

      return res.status(200).json({
        success: true,
        message: 'All messages deleted',
        deletedCount: result.affectedRows,
      });
    }

    // ❌ Unsupported method
    else {
      await connection.end();
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
