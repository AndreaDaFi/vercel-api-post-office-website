import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Headers de seguridad
  res.setHeader('x-content-type-options', 'nosniff');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Conexión DB
  const connectDB = async () => {
    return await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });
  };

  try {
    if (req.method === 'GET') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, error: '⚠ Missing customer ID.' });
      }

      const db = await connectDB();
      const [messages] = await db.execute(
        `SELECT * FROM customer_messages WHERE packages_customers_id = ? AND message_read = 0`,
        [id]
      );
      await db.end();

      return res.status(200).json({ success: true, messages });
    }

    else if (req.method === 'PUT') {
      const { customer_id, tracking_number } = req.body;

      if (!customer_id || !tracking_number) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customer_id and tracking_number.',
        });
      }

      const db = await connectDB();
      const [result] = await db.execute(
        `UPDATE customer_messages SET message_read = 1 
         WHERE packages_tracking_number = ? AND packages_customers_id = ?`,
        [tracking_number, customer_id]
      );
      await db.end();

      return res.status(200).json({
        success: true,
        message: '✅ Message marked as read',
        affectedRows: result.affectedRows,
      });
    }

    // ❌ Otros métodos no permitidos
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use GET or PUT.' });

  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
