import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Headers para CORS y seguridad
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // CORS preflight
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    if (req.method === 'GET') {
      const { customer_id } = req.query;

      if (!customer_id) {
        return res.status(400).json({ success: false, error: 'customer_id is required' });
      }

      // 1. Seleccionar mensajes no leídos
      const [messages] = await connection.execute(
        `SELECT * FROM customer_messages
         WHERE packages_customers_id = ?
         AND message IS NOT NULL
         AND message_read = FALSE`,
        [customer_id]
      );

      // 2. Marcarlos como leídos y borrar el mensaje
      await connection.execute(
        `UPDATE customer_messages
         SET message_read = TRUE,
             message = NULL
         WHERE packages_customers_id = ?
         AND message IS NOT NULL
         AND message_read = FALSE`,
        [customer_id]
      );

      await connection.end();
      return res.status(200).json({ success: true, messages });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
