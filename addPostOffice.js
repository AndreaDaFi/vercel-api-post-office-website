import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { street, street2, apt, city_name, state_id, zip } = req.body;

  // Validate input data
  if (!street || !city_name || !state_id || !zip) {
    return res.status(400).json({ success: false, error: '⚠ All required fields must be provided.' });
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
    });

    console.log("✅ Database connected!");

    // Start transaction
    await connection.beginTransaction();

    try {
      // Insert into address table
      const addressQuery = `
        INSERT INTO address (street, street2, apt, city_name, state_id, zip)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [addressResult] = await connection.execute(addressQuery, [
        street,
        street2 || null,
        apt || null,
        city_name,
        state_id,
        zip,
      ]);

      const addressID = addressResult.insertId; // Capture address_id
      console.log("✅ Address inserted with ID:", addressID);

      // Insert into post_office table using captured address_id
      const postOfficeQuery = `
        INSERT INTO post_office (po_address_id)
        VALUES (?)
      `;
      await connection.execute(postOfficeQuery, [addressID]);

      console.log("✅ Post office added successfully!");

      // Commit transaction
      await connection.commit();
      await connection.end();

      res.status(201).json({ success: true, message: 'Post office added successfully!' });
    } catch (error) {
      console.error("❌ Error during transaction:", error);

      // Rollback transaction on error
      await connection.rollback();
      await connection.end();

      res.status(500).json({ success: false, error: error.message });
    }
  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
