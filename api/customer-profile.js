import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
    }

    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, error: '⚠ Missing customer ID.' });
    }

    console.log(`🔍 Fetching profile for customer ID: ${customer_id}`);

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log('✅ Database connected!');

    const [rows] = await connection.execute(
      `SELECT c.first_name, c.last_name, c.email, c.phone,
              a.street, a.city_name, a.state_id, a.zip
       FROM customers c
       JOIN address a ON c.address_id = a.address_id
       WHERE c.customers_id = ?`,
      [customer_id]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const profile = {
      first_name: rows[0].first_name,
      last_name: rows[0].last_name,
      email: rows[0].email,
      phone: rows[0].phone,
      address: {
        street: rows[0].street,
        city: rows[0].city_name,
        state: rows[0].state_id,
        zip: rows[0].zip,
      },
    };

    console.log('👤 Profile found:', profile);
    return res.status(200).json({ success: true, profile });

  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
