import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ✅ Only allow GET requests for this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { trackingNumber } = req.query;

  if (!trackingNumber) {
    return res.status(400).json({ success: false, error: 'trackingNumber is required' });
  }

  try {
    console.log('⏳ Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA
        ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
        : false,
      connectTimeout: 5000,
    });

    console.log('✅ Database connected!');

    const [rows] = await connection.execute(
      `SELECT tracking_number, previoust_status AS previous_status, updated_status, status_update_datetime 
       FROM employees_updates_to_packages 
       WHERE tracking_number = ? 
       ORDER BY status_update_datetime ASC`,
      [trackingNumber]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No tracking history found for this tracking number' });
    }

    console.log('📦 History found:', rows);
    return res.status(200).json({ success: true, history: rows });

  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
