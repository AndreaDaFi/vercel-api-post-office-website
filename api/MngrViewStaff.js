import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Set CORS headers to allow frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // ✅ Preflight response
  }

  if (req.method === 'GET') {
    const { mngr_id } = req.query;

    try {
      console.log("⏳ Connecting to database...");
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

      console.log("✅ Database connected!");

      // ✅ Fetch employees based on manager's ID (po_id)
      const [rows] = await connection.execute(
        `SELECT e.employees_id AS id, 
                CONCAT(e.first_name, ' ', e.last_name) AS name, 
                e.email, 
                e.phone, 
                e.role
         FROM employees AS e
         WHERE e.mngr_id = ?`, [mngr_id] // Use the manager's ID to filter employees
      );

      await connection.end();
      console.log("✅ Query executed successfully!", rows);

      res.status(200).json({ success: true, data: rows });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}