// /api/markMessageRead.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use PUT.' });
  }

  const { customer_id } = req.body;

  if (!customer_id) {
    return res.status(400).json({ success: false, error: 'Missing customer ID.' });
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
    });

    await connection.execute(
      `UPDATE customer_messages SET message_read = 1 WHERE packages_customers_id = ? AND message_read = 0`,
      [customer_id]
    );

    await connection.end();

    return res.status(200).json({ success: true, message: 'Mensajes marcados como leídos' });
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
