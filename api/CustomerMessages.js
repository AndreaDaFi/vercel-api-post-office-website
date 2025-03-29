import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('x-content-type-options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();

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

      const [rows] = await connection.execute(
        `SELECT cm.packages_tracking_number, cm.packages_customers_id, cm.message_read,
                p.status
         FROM customer_messages cm
         JOIN packages p ON cm.packages_tracking_number = p.tracking_number
         WHERE cm.packages_customers_id = ?
           AND cm.message_read = 0
           AND p.status = 'Delivered'`,
        [customer_id]
      );

      const messages = rows.map((row) => ({
        tracking_number: row.packages_tracking_number,
        customer_id: row.packages_customers_id,
        message_read: row.message_read,
        message: `Package #${row.packages_tracking_number} has been delivered!`
      }));

      await connection.end();
      return res.status(200).json({ success: true, messages });
    }

    // PUT: Mark messages as read
    if (req.method === 'PUT') {
      const { tracking_number, message_ids } = req.query;

      if (tracking_number) {
        const [statusCheck] = await connection.execute(
          `SELECT status FROM packages WHERE tracking_number = ?`,
          [tracking_number]
        );

        if (!statusCheck.length || statusCheck[0].status !== 'Delivered') {
          await connection.end();
          return res.status(403).json({ success: false, error: 'Package not delivered yet' });
        }

        await connection.execute(
          `UPDATE customer_messages SET message_read = 1 WHERE packages_tracking_number = ?`,
          [tracking_number]
        );
        await connection.end();
        return res.status(200).json({ success: true, message: 'Message marked as read' });
      }

      if (message_ids) {
        const ids = Array.isArray(message_ids) ? message_ids : [message_ids];
        await connection.execute(
          `UPDATE customer_messages SET message_read = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
          ids
        );
        await connection.end();
        return res.status(200).json({ success: true, message: 'Messages marked as read' });
      }

      await connection.end();
      return res.status(400).json({ success: false, error: 'Tracking number or message_ids required' });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
