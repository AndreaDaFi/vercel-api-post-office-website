const http = require('http');
const mysql = require('mysql2');
const dotenv = require('dotenv');

// Load environment variables from the .env file
dotenv.config();

// Create an SSL certificate from the environment variable (base64 encoded)
const sslCA = Buffer.from(process.env.DB_SSL_CA, 'base64');

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASS,
    database: process.env.DBNAME,
    ssl: {
      ca: sslCA, // Provide the certificate for SSL connection
    }
});

// Create an HTTP server to handle requests
const server = http.createServer((req, res) => {
  // Log the method and URL for debugging purposes
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}`);

  // Set the response header to return JSON data
  res.setHeader('Content-Type', 'application/json');

  // Handle the GET request to fetch package data
  if (req.method === 'GET' && req.url === '/api/state') {
    // Query the database to get all state data
    pool.query('SELECT * FROM state', (err, results) => {
      if (err) {
        console.error('Database query error:', JSON.stringify(err));  // Log the full error to the console
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Database query failed', details: err.message }));
        return;
      }
  
      // Return the results as a JSON response
      res.statusCode = 200;
      res.end(JSON.stringify(results));
    });
  } else {
    // Handle invalid routes
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
