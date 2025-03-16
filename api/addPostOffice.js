import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ CORS Headers - Allow frontend to make requests
  res.setHeader('Access-Control-Allow-Origin', 'https://post-office-website.vercel.app'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle Preflight (OPTIONS) Requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); 
  }

  // ✅ Ensure request is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    console.log("📩 Received POST request:", req.body);

    // ✅ Extract data from request
    const { state, city, address, zip } = req.body;

    // ✅ Validate required fields
    if (!state || !city || !address || !zip) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // ✅ Connect to database
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

    console.log("✅ Connected to database");

    // ✅ Insert new post office into the database
    const query = `
      INSERT INTO post_office (state, city, address, zip)
      VALUES (?, ?, ?, ?)
    `;
    const values = [state, city, address, zip];

    const [result] = await connection.execute(query, values);

    // ✅ Close database connection
    await connection.end();

    console.log("✅ Post Office added successfully:", result);

    return res.status(200).json({ success: true, message: "Post Office added successfully" });
  } catch (error) {
    console.error("❌ API Error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
