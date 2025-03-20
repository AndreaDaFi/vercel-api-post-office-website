import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow only the specific frontend
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond with status 200 for OPTIONS request
  }

  // Handle POST requests
  if (req.method === "POST") {
    const {
      itemName,
      category,
      price,
      quantity,
      po_id
    } = req.body;

    try {
      console.log("Incoming request body:", req.body); // Log incoming request body

      // Log database connection parameters
      console.log("⏳ Connecting to database with params:", {
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        database: process.env.DBNAME
      });

      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      const [repeatItems] = await connection.execute("SELECT COUNT(*) as num FROM items_for_sale WHERE item_name=?",
      [itemName]);

      if(repeatItems[0].num > 0){
        return res.status(400).json({success: false, error: "There already exists an item for sale with this name, restock instead?"});
      }
      console.log("item qualifies to be added");

      const [custSuccessorNot] = await connection.execute(`
        INSERT INTO items_for_sale (item_price, item_name, stock, po_id, item_category)
        VALUES (?, ?, ?, ?, ?)
      `, [price, itemName, quantity, po_id, category]);

      await connection.end();
      console.log("✅ Database connection closed.");

      // Send success response
      res.status(200).json({ success: true, message: "item was added successfully!" });

    } catch (error) {
      console.error("❌ API Error:", error);  // Log full error with stack trace
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
