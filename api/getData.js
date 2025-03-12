// api/getData.js
const mysql = require('mysql2');

module.exports = async (req, res) => {
  // MySQL connection settings (stored as environment variables for security)
  const connection = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME,
  });

  // Query the database
  connection.query('SELECT * FROM states', (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Error querying database' });
    }

    // Send the results as a JSON response
    res.status(200).json(results);
  });

  // Close the connection
  connection.end();
};