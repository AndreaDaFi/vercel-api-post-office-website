import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 🔹 GET: Fetch messages for a customer (filter by read/unread)
  if (req.method === 'GET') {
    const { id, is_read } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: '⚠ Missing customer ID.' });
    }

    try {
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      let query = `SELECT * FROM customer_messages WHERE packages_customers_id = ?`;
      const params = [id];

      if (is_read !== undefined) {
        query += ` AND message_read = ?`;
        params.push(Number(is_read));
      }

      const [messages] = await connection.execute(query, params);
      await connection.end();

      return res.status(200).json({ success: true, messages });
    } catch (error) {
      console.error('❌ GET Error:', error.message);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  // 🔹 PUT: Mark a specific message as read
  if (req.method === 'PUT') {
    let body = req.body;

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid JSON body.' });
      }
    }

    const { customer_id, tracking_number } = body;

    if (!customer_id || !tracking_number) {
      return res.status(400).json({ success: false, error: 'Missing required fields: customer_id and tracking_number.' });
    }

    try {
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      const [result] = await connection.execute(
        `UPDATE customer_messages SET message_read = 1 WHERE packages_tracking_number = ? AND packages_customers_id = ?`,
        [tracking_number, customer_id]
      );

      await connection.end();

      return res.status(200).json({
        success: true,
        message: 'Message marked as read',
        affectedRows: result.affectedRows,
      });
    } catch (error) {
      console.error('❌ PUT Error:', error.message);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  // ❌ Unsupported method
  return res.status(405).json({ success: false, error: 'Method Not Allowed. Use GET or PUT.' });
}
