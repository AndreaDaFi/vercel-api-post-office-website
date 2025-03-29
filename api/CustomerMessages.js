// pages/api/CustomerMessages.js

import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('x-content-type-options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const customerId = req.query.customerId;

    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Missing customerId' });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    const [rows] = await connection.execute(
      `SELECT * FROM customer_messages WHERE packages_customers_id = ? AND message_read = 0`,
      [customerId]
    );

    await connection.end();

    return res.status(200).json({ success: true, messages: rows });
  } catch (error) {
    console.error("❌ Error in CustomerMessages API:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
