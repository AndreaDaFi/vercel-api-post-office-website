import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // Preflight response
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use PUT.' });
  }

  try {
    let body = req.body;

    // Handle stringified JSON if needed
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const { customer_id, tracking_number } = body;

    if (!customer_id || !tracking_number) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_id and tracking_number.',
      });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    const [result] = await connection.execute(
      `UPDATE customer_messages 
       SET message_read = 1 
       WHERE packages_tracking_number = ? AND packages_customers_id = ?`,
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
