// pages/api/mark-read.js

import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('x-content-type-options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'PUT') {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    await connection.execute(`
      UPDATE customer_messages
      SET message_read = 1
      WHERE packages_customers_id = ? AND message_read = 0
    `, [customerId]);

    await connection.end();
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
