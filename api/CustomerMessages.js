import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('x-content-type-options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'PUT') {
    const { tracking_number } = req.query;

    if (!tracking_number) {
      return res.status(400).json({ success: false, error: 'Tracking number is required' });
    }

    try {
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
      });

      // Verificar si el paquete está entregado
      const [packages] = await connection.execute(
        `SELECT status FROM packages WHERE tracking_number = ?`,
        [tracking_number]
      );

      if (!packages.length || packages[0].status !== 'Delivered') {
        await connection.end();
        return res.status(403).json({ success: false, error: 'Package not delivered yet' });
      }

      // Ahora sí actualizamos el mensaje
      await connection.execute(
        `UPDATE customer_messages
         SET message_read = 1
         WHERE packages_tracking_number = ?`,
        [tracking_number]
      );

      await connection.end();
      return res.status(200).json({ success: true, message: 'Message marked as read' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
