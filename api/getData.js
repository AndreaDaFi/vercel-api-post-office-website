// api/getData.js
const mysql = require('mysql2'); // Use CommonJS `require()` instead of `import`

module.exports = async (req, res) => {
  // Path to your SSL certificate file, adjust if needed
  const sslCA = fs.readFileSync('./DigiCertGlobalRootCA.crt'); // Ensure this is the correct path

  // MySQL connection settings (stored as environment variables for security)
  const pool = mysql.createPool({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Query the database
  pool.query('SELECT * FROM states', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error querying database' });
    }

    // Send the results as a JSON response
    res.status(200).json(results);
  });
};
