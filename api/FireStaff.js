import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const { selectedItem } = req.body; // Expecting { selectedItem: value }

    if (!selectedItem) {
      return res.status(400).json({ success: false, error: "Missing selectedItem" });
    }

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

      // ✅ Update the stock of the selected item
      const [rows] = await connection.execute(
        `UPDATE employees
        SET is_active = 0
        WHERE employees_id = ?;`, [selectedItem]
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
