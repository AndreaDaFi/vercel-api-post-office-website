// Import mysql2
const mysql = require('mysql2'); // Import the MySQL client

module.exports = async (req, res) => {
  try {
    const sslCA = Buffer.from(process.env.DB_SSL_CA, 'base64');
    console.log("⏳ Connecting to Azure MySQL...");

    // Create the MySQL connection
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        ca: sslCA, // Provide the certificate for SSL connection
      }
    });

    console.log("✅ Database connection successful!");
    
    // Query to check the database connection
    const [rows, fields] = await connection.execute('SELECT * FROM state');
    console.log("🕒 Database Time:", rows[0].now); // Assuming 'now' is a column in your state table

    // Respond with success
    res.status(200).json({
      message: "Database connection successful",
      time: rows[0].now
    });

    // Close the connection
    await connection.end();
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    
    // Send error response
    res.status(500).json({
      error: "Database connection failed",
      message: error.message
    });
  }
};
