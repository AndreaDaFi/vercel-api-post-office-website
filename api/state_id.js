import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Allow frontend to access API (CORS fix)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle CORS pre-flight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ❌ Fix: Ensure API only allows GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    console.log("⏳ Connecting to database...");
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      connectTimeout: 5000
    });

    console.log("✅ Database connected!");

    // ✅ Fetch all state IDs and names
    const [results] = await connection.execute("SELECT state_id, state_name FROM state ORDER BY state_name ASC");

    await connection.end();

    if (results.length === 0) {
      console.warn("⚠ No states found in database.");
    }

    return res.status(200).json({ success: true, data: results });

  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
