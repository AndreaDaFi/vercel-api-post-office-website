// api/getData.js
const mysql = require('mysql2');

module.exports = async (req, res) => {
  // Path to your SSL certificate file (ensure it is correct)
  const sslCA = Buffer.from(process.env.DB_SSL_CA, 'base64'); // Ensure this is the correct path to the certificate

  // MySQL connection settings (stored as environment variables for security)
  const pool = mysql.createPool({
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

  // Query the database
  pool.query("SELECT * FROM state WHERE state_name = 'Texas'";, (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error querying database' });
    }
  
    // Send the results as a JSON response
    res.status(200).json(results);
  });
};