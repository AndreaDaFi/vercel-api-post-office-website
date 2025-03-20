import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Set CORS headers for security & frontend access
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');  // Change '*' to your frontend URL in production
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ✅ Handle OPTIONS pre-flight request (CORS fix)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  let connection;

  try {
    console.log("⏳ Connecting to database...");

    connection = await mysql.createConnection({
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
    console.log("🔒 SSL Connection:", process.env.DB_SSL_CA ? "Enabled" : "Disabled");

    // ✅ Query to fetch post office locations with address and state
    const [rows] = await connection.execute(`
      SELECT po.po_id, ad.street, s.state_name, ad.city_name
      FROM post_office AS po
      JOIN address AS ad ON po.po_address_id = ad.address_id
      JOIN state AS s ON ad.state_id = s.state_id
      ORDER BY ad.city_name ASC
    `);

    console.log("✅ Query executed successfully!", rows.length, "rows fetched");

    // ✅ Send successful response
    res.status(200).json({ success: true, data: rows });

  } catch (error) {
    console.error("❌ API Error:", error.message);
    console.error(error.stack);  // Log full stack trace for debugging

    res.status(500).json({ success: false, error: "Internal Server Error" });

  } finally {
    // ✅ Ensure the database connection is closed even if an error occurs
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed.");
    }
  }
}
