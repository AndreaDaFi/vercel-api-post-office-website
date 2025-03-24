import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins (adjust for production)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond with status 200 for OPTIONS request
  }

  // Handle POST requests
  if (req.method === 'POST') {
    const { trackingNumber, employeeId, status } = req.body;

    // Validate input data
    if (!trackingNumber) {
      return res.status(400).json({ success: false, error: 'Invalid tracking number.' });
    }
    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Invalid employee ID.' });
    }
    if (!status) {
      return res.status(400).json({ success: false, error: 'Package status is required.' });
    }

    try {
      console.log("⏳ Connecting to database...");
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000
      });

      console.log("✅ Database connected!");

      // Check if employee exists and retrieve their post office ID
      const [employeeRows] = await connection.execute(
        `SELECT po_id FROM employees WHERE employees_id = ?`,
        [employeeId]
      );

      if (!employeeRows.length) {
        await connection.end();
        return res.status(404).json({ success: false, error: 'Employee not found.' });
      }

      const employeePostOfficeId = employeeRows[0].po_id;

      console.log(`Employee found with post office ID: ${employeePostOfficeId}`);

      // Check if package exists and retrieve its post office ID, current status, and customer ID
      const [packageRows] = await connection.execute(
        `SELECT po_id, status, customers_id FROM packages WHERE tracking_number = ?`,
        [trackingNumber]
      );

      if (!packageRows.length) {
        await connection.end();
        return res.status(404).json({ success: false, error: 'Package not found.' });
      }

      const packagePostOfficeId = packageRows[0].po_id;
      const previousStatus = packageRows[0].status;
      const customersId = packageRows[0].customers_id;

      console.log(`Package found with post office ID: ${packagePostOfficeId}, current status: ${previousStatus}, customer ID: ${customersId}`);

      // Ensure the employee is authorized to update the package
      if (employeePostOfficeId !== packagePostOfficeId) {
        await connection.end();
        return res.status(403).json({
          success: false,
          error: 'Employee is not authorized to update this package.',
        });
      }

      // Start transaction
      await connection.beginTransaction();

      try {
        // Update the package status
        await connection.execute(
          `UPDATE packages SET status = ? WHERE tracking_number = ?`,
          [status, trackingNumber]
        );

        console.log(`Package status updated to "${status}"`);

        // Log the update in employees_updates_to_packages table
        await connection.execute(
          `INSERT INTO employees_updates_to_packages 
           (employees_id, tracking_number, customers_id, previoust_status, updated_status, status_update_datetime)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [employeeId, trackingNumber, customersId, previousStatus, status]
        );

        console.log("Update logged in employees_updates_to_packages table");

        // Commit transaction
        await connection.commit();
        await connection.end();

        console.log("✅ Transaction committed successfully!");

        return res.status(200).json({ success: true, message: 'Package status updated successfully.' });

      } catch (transactionError) {
        console.error("❌ Error during transaction:", transactionError);

        // Rollback transaction on error
        await connection.rollback();

        throw transactionError; // Re-throw error for outer catch block
      }
    } catch (error) {
      console.error("❌ API Error:", error);

      return res.status(500).json({ success: false, error: error.message });
    }
  } else {
    // Handle unsupported methods
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
