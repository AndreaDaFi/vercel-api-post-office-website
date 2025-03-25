import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method Not Allowed. Use POST." });
    }

    const { date, hours, employees_id, po_id } = req.body;

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date)) {
      return res.status(400).json({ success: false, error: "⚠ Invalid date format. Use YYYY-MM-DD." });
    }

    if (!hours || !employees_id || !po_id) {
      return res.status(400).json({ success: false, error: "⚠ Missing required fields." });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
      connectTimeout: 5000,
    });

    console.log("✅ Database connected!");

    // Validate employees_id
    const [employeeExists] = await connection.execute(
      "SELECT COUNT(*) AS count FROM employees WHERE employees_id = ?",
      [employees_id]
    );
    if (employeeExists[0].count === 0) {
      await connection.end();
      return res.status(400).json({ success: false, error: "⚠ Invalid employee ID." });
    }

    // Validate po_id
    const [postOfficeExists] = await connection.execute(
      "SELECT COUNT(*) AS count FROM post_office WHERE po_id = ?",
      [po_id]
    );
    if (postOfficeExists[0].count === 0) {
      await connection.end();
      return res.status(400).json({ success: false, error: "⚠ Invalid post office ID." });
    }

    // Insert data into the hours table
    const query = `
      INSERT INTO hours (date, hours, employees_id, po_id)
      VALUES (?, ?, ?, ?)
    `;
    
    await connection.execute(query, [date, hours, employees_id, po_id]);
    
    await connection.end();
    
    console.log("✅ Hours recorded successfully!");
    
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ API Error:", error.message);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
