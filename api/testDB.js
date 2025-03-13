// Import mysql2
const mysql = require('mysql2'); // Import the MySQL client
const dotenv = require('dotenv'); // Import the dotenv module
dotenv.config(); // Load environment variables
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

    // SQL query to insert a new state
    const insertQuery = `
      INSERT INTO state (state_name, state_id, tax)
      VALUES (?, ?, ?)
    `;

    // Execute the insert query with the values
    const result = await connection.execute(insertQuery, ['Alabama', 'al', 1.04]);

    // Log the entire result object to see its structure
    console.log("Query Result:", result);

    // Return success response if result is valid
    if (result && result[0]) {
      console.log("✅ State inserted successfully:", result);
      res.status(200).json({
        message: "State inserted successfully",
        insertedId: result[0].insertId // Return the ID of the inserted row (if applicable)
      });
    } else {
      console.error("❌ Unexpected result format:", result);
      res.status(500).json({
        error: "Unexpected result format",
        message: "The query did not return the expected result."
      });
    }

    // Close the connection
    await connection.end();
  } catch (error) {
    console.error("❌ Database operation failed:", error.message);
    
    // Send error response
    res.status(500).json({
      error: "Database operation failed",
      message: error.message
    });
  }
};
