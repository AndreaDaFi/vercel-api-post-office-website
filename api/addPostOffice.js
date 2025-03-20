import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    console.log("⏳ Connecting to the database...");
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      connectTimeout: 5000
    });

    console.log("✅ Database connected!");

    const { state_id, city_name, street, zip } = req.body;

    if (!state_id || !city_name || !street || !zip) {
      await connection.end();
      return res.status(400).json({ success: false, error: "⚠ All fields are required" });
    }

    console.log("🟢 Inserting address...");
    const [addressResult] = await connection.execute(
      `INSERT INTO address (street, city_name, state_id, zip) VALUES (?, ?, ?, ?)`,
      [street, city_name, state_id, zip]
    );

    const address_id = addressResult.insertId; // ✅ Retrieve auto-generated `address_id`
    console.log(`✅ Address inserted with ID: ${address_id}`);

    console.log("🟢 Inserting into post_office table...");
    const [postOfficeResult] = await connection.execute(
      `INSERT INTO post_office (po_address_id) VALUES (?)`, // ✅ Insert `address_id`
      [address_id]
    );

    await connection.end();
    console.log("✅ Post Office added successfully!");

    return res.status(201).json({ 
      success: true, 
      message: "✅ Post Office added successfully!", 
      address_id, 
      post_office_id: postOfficeResult.insertId // ✅ Get post office ID
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
