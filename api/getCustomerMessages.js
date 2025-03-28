import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // Preflight success
  }

  // GET request with customer ID as query parameter
  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, error: "⚠ Missing customer ID." });
    }

    try {
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      // Using the correct column name: packages_customers_id instead of customers_id
      // And message_read instead of is_read
      const [messages] = await connection.execute(
        "SELECT * FROM customer_messages WHERE packages_customers_id = ? AND message_read = 0",
        [id]
      );

      await connection.end();

      return res.status(200).json({ success: true, messages });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
  
  // PUT request to mark a message as read
  else if (req.method === "PUT") {
    try {
      const { customer_id, tracking_number } = req.body;
      
      if (!customer_id || !tracking_number) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: customer_id and tracking_number are required" 
        });
      }
      
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });
      
      // Using the correct column names for the update
      const [result] = await connection.execute(
        "UPDATE customer_messages SET message_read = 1 WHERE packages_tracking_number = ? AND packages_customers_id = ?",
        [tracking_number, customer_id]
      );
      
      await connection.end();
      
      return res.status(200).json({
        success: true,
        message: "Message marked as read",
        affectedRows: result.affectedRows
      });
      
    } catch (error) {
      console.error("❌ API Error:", error.message);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  }
  
  // Method not allowed
  else {
    return res.status(405).json({ success: false, error: "Method Not Allowed. Use GET or PUT." });
  }
}
