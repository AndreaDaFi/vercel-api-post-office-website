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

    // SQL query to insert a new state
    const insertQuery = `
      INSERT INTO state (state_name, state_id, tax)
      VALUES (?, ?, ?)
    `;

    // Execute the insert query with the values
    const [result] = await connection.execute(insertQuery, ['Alabama', 'al', 1.04]);

    console.log("✅ State inserted successfully:", result);

    // Return success response
    res.status(200).json({
      message: "State inserted successfully",
      insertedId: result.insertId // Return the ID of the inserted row (if applicable)
    });

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
