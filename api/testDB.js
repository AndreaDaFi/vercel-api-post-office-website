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
    const result = await connection.execute('SELECT * FROM state');
    
    // Log the entire result object to understand its structure
    console.log("Query Result:", result);

    // Check if the result is iterable (array of rows)
    if (Array.isArray(result[0])) {
      console.log("🕒 Database Time:", result[0][0].now); // Assuming 'now' is a column in your state table
      res.status(200).json({
        message: "Database connection successful",
        time: result[0][0].now
      });
    } else {
      console.error("❌ Unexpected result format:", result);
      res.status(500).json({
        error: "Unexpected result format",
        message: "The query did not return an array of rows."
      });
    }

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
