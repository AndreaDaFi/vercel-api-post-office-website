import mysql from 'mysql2/promise'

export default async function handler(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');  // You can replace '*' with your actual frontend URL for better security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' })
  }

  const { po_id } = req.body

  if (!po_id) {
    return res.status(400).json({ success: false, error: 'Missing po_id (post office ID)' })
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    })
    console.log("DG CONNECTED :)");

    const [packages] = await connection.execute(
      `SELECT tracking_number, status, weight, receiver_name, type,
CONCAT(ao.street, ao.apt, ', ', ao.city_name, ' ', ao.state_id) AS 'prigin_address', ao.state_id AS 'origin_state',
CONCAT(ad.street, ad.apt, ', ', ad.city_name, ' ', ad.state_id) AS 'destination_address', ad.state_id AS 'destination_state',
fast_delivery
       FROM packages AS p
       JOIN address AS ad ON ad.address_id=p.destination_address_id
       JOIN address AS ao ON ao.address_id=p.origin_address_id
       WHERE po_id = ?;`,
      [po_id]
    )

    await connection.end()

    return res.status(200).json({ success: true, packages })
  } catch (err) {
    console.error('❌ DB Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
