import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');  // You can replace '*' with your actual frontend URL for better security
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Check for GET method
  if (req.method === 'GET') {
    const { address_id } = req.query;  // Extract the address_id from the query params

    if (!address_id) {
      return res.status(400).json({ success: false, error: 'address_id is required' });
    }

    try {
      // Connect to the database
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

      // Query to fetch the tax based on address_id and its state_id
      const [rows] = await connection.execute(`
        SELECT state.tax 
        FROM address 
        JOIN state ON address.state_id = state.state_id
        WHERE address.address_id = ?
      `, [address_id]);

      await connection.end();

      // Check if a tax rate was found
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'No tax found for the provided address_id' });
      }

      // Round the tax rate to three decimal places (thousandths)
      const roundedTax = parseFloat(rows[0].tax).toFixed(4);

      console.log("✅ Query executed successfully!", rows);
      res.status(200).json({ success: true, data: parseFloat(roundedTax) });  // Return the tax rate rounded to thousandths

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
