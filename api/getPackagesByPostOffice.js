import mysql from 'mysql2/promise'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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

    const [packages] = await connection.execute(
      `SELECT tracking_number, status, weight, receiver_name, type
       FROM packages
       WHERE po_id = ?`,
      [po_id]
    )

    await connection.end()

    return res.status(200).json({ success: true, packages })
  } catch (err) {
    console.error('❌ DB Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
