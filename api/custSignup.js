import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://post-office-website.vercel.app');  // Allow only the specific frontend
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond with status 200 for OPTIONS request
  }

  // Handle POST requests
  if (req.method === "POST") {
    const {
      firstName,
      lastName,
      birthdate,
      streetAddress,
      streetAddress2,
      apt,
      cityName,
      stateID,
      zipCode,
      email,
      password,
      phone,
      securityQuestion,
      securityAnswer
    } = req.body;

    try {
      console.log("Incoming request body:", req.body); // Log incoming request body

      // Log database connection parameters
      console.log("⏳ Connecting to database with params:", {
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        database: process.env.DBNAME
      });

      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      // Insert address
      const [addressSuccessorNot] = await connection.execute(`
        INSERT INTO address (street, street2, apt, city_name, state_id, zip)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [streetAddress, streetAddress2, apt, cityName, stateID, zipCode]);

      const newAddID = addressSuccessorNot.insertId;
      console.log("Address insert result:", addressSuccessorNot);

      // Insert customer
      const [custSuccessorNot] = await connection.execute(`
        INSERT INTO customers (first_name, last_name, birthdate, email, password, phone, security_question, security_answer, address_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [firstName, lastName, birthdate, email, password, phone, securityQuestion, securityAnswer, newAddID]);

      console.log("Customer insert result:", custSuccessorNot);

      await connection.end();
      console.log("✅ Database connection closed.");

      // Send success response
      res.status(200).json({ success: true, message: "Customer created successfully!" });

    } catch (error) {
      console.error("❌ API Error:", error);  // Log full error with stack trace
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
