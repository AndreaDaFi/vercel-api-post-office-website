import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow only the specific frontend
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
      salary,
      hire_date,
      ssn,
      role,
      postOfficeID,
      street,
      streetLine2,
      aptNumber,
      city,
      state,
      zipCode,
      email,
      phone,
      password,
      securityCode,
      securityQuestion,
      securityAnswer
    } = req.body;

    // Validate input data
    if (!firstName || !lastName || !birthdate || !salary || !ssn || !role || !postOfficeID || !street || !city || !state || !zipCode || !email || !phone || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    try {
      console.log("Incoming request body:", req.body); // Log incoming request body

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
        connectTimeout: 5000
      });

      console.log("✅ Database connected!");

      // Check if post office exists
      const [postOfficeRows] = await connection.execute('SELECT * FROM post_office WHERE po_id = ?', [postOfficeID]);
      
      if (!postOfficeRows.length) {
        await connection.end();
        return res.status(400).json({ success: false, error: 'Post office does not exist' });
      }

      console.log("Post office exists:", postOfficeRows);

      // Start transaction
      await connection.beginTransaction();

      try {
        const hireDate = hire_date
          ? new Date(hire_date).toISOString().split('T')[0] // Format provided date
          : new Date().toISOString().split('T')[0];        // Default to today's date

        // Insert address
        const addressQuery = `
          INSERT INTO address (street, street2, apt, city_name, state_id, zip)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [addressInsertResult] = await connection.execute(addressQuery, [
          street, 
          streetLine2 || null, 
          aptNumber || null, 
          city, 
          state, 
          zipCode
        ]);

        const addressID = addressInsertResult.insertId;
        console.log("Address insert result:", addressInsertResult);

        // Insert employee
        const employeeQuery = `
          INSERT INTO employees (
            first_name, last_name, birthdate, salary, hire_date, po_id, ssn, employees_address_id, 
            password, security_code, security_question, security_answer, email, phone, role
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [employeeInsertResult] = await connection.execute(employeeQuery, [
          firstName,
          lastName,
          birthdate,
          salary,
          hireDate,
          postOfficeID,
          ssn,
          addressID,
          password,
          securityCode || null,
          securityQuestion,
          securityAnswer,
          email,
          phone,
          role
        ]);

        console.log("Employee insert result:", employeeInsertResult);

        // Commit transaction and close connection
        await connection.commit();
        await connection.end();
        
        console.log("✅ Manager added successfully!");
        
        res.status(201).json({ success: true, message: 'Manager added successfully' });
      
      } catch (error) {
        console.error("❌ Error during transaction:", error);
        
        // Rollback transaction on error
        await connection.rollback();
        
        throw error; // Re-throw error for outer catch block
      }
    } catch (error) {
      console.error("❌ API Error:", error); // Log full error with stack trace
      
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
