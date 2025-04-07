import mysql from "mysql2/promise";

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader("x-content-type-options", "nosniff");

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow only the specific frontend
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Respond with status 200 for OPTIONS request
  }

  // Handle POST requests
  if (req.method === "POST") {
    const {
      email,
      receiver_name,
      street,
      street2,
      apt,
      city_name,
      state_id,
      zip,
      weight,
      size,
      status,
      purchased_insurance,
      fast_delivery,
      fragile,
      po_id,
      type,
      base_price,
      transaction_date,
    } = req.body;

    try {
      console.log("Incoming request body:", req.body); // Log incoming request body

      // Log database connection parameters
      console.log("⏳ Connecting to database with params:", {
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        database: process.env.DBNAME,
      });

      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA
          ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") }
          : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      // If type is 'envelope', we don't need to pass weight and size
      let finalWeight = null;
      let finalSize = null;

      if (type !== "envelope") {
        // Ensure that weight and size are numbers
        finalWeight = weight ? parseFloat(weight) : null;
        finalSize = size ? size : null; // size might be a string; ensure it's passed as-is or null
      }

      const [customerResult] = await connection.execute(
        `
    SELECT customers_id, address_id FROM customers WHERE email = ?
  `,
        [email]
      );

      const customers_id =
        customerResult.length > 0 ? customerResult[0].customers_id : null;
    console.log("✅ customer id obtained");
      const origin_address_id = 
        customerResult.length > 0 ? customerResult[0].address_id : null;
        console.log("✅ customer address id obtained");

      if (customers_id === null) {
        res.status(500).json({ success: false, error: "No ID customer found with the given email" });
      }

      if (origin_address_id === null) {
        res.status(500).json({ success: false, error: "No Address for customer found with the given email" });
      }
      // 1. Insert the destination address
      const [addressResult] = await connection.execute(
        `
        INSERT INTO address (street, street2, apt, city_name, state_id, zip)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [street, street2, apt, city_name, state_id, zip]
      );

      const destination_address_id = addressResult.insertId;
      console.log(
        "Destination address inserted with ID:",
        destination_address_id
      );

      const [packageResult] = await connection.execute(
        `
        INSERT INTO packages (status, customers_id, origin_address_id, destination_address_id, purchased_insurance,
                              fast_delivery, fragile, po_id, receiver_name, type, weight, size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          status,
          customers_id,
          origin_address_id,
          destination_address_id,
          purchased_insurance,
          fast_delivery,
          fragile,
          po_id,
          receiver_name,
          type,
          finalWeight,
          finalSize,
        ]
      );

      const tracking_number = packageResult.insertId;
      console.log("Package inserted with tracking number:", tracking_number);

      // 3. Fetch the tax for the destination state
      const [taxResult] = await connection.execute(
        `
        SELECT tax FROM state WHERE state_id = ?
      `,
        [state_id]
      );

      if (!taxResult.length) {
        return res
          .status(400)
          .json({ success: false, error: "Tax not found for the given state" });
      }

      const state_tax = taxResult[0].tax;
      console.log("Tax rate for state_id", state_id, ":", state_tax);

      // 4. Calculate the total tax and total amount
      const total_tax = (base_price * (state_tax - 1)).toFixed(2);
      const total_amount = (base_price * state_tax).toFixed(2);

      console.log("Calculated total tax:", total_tax);
      console.log("Calculated total amount:", total_amount);

      // 5. Insert into the transactions table
      const [transactionResult] = await connection.execute(
        `
        INSERT INTO transactions (total_amount, transaction_date, total_tax, customers_id_fk, packages_tracking_number, po_id)
        VALUES (ROUND(?, 2), ?, ?, ?, ?, ?)
      `,
        [
          total_amount,
          transaction_date,
          total_tax,
          customers_id,
          tracking_number,
          po_id,
        ]
      );

      console.log("Transaction inserted successfully!");

      // Close database connection
      await connection.end();
      console.log("✅ Database connection closed.");

      // Send success response
      res
        .status(200)
        .json({ success: true, message: "Checkout processed successfully!" });
    } catch (error) {
      console.error("❌ API Error:", error); // Log full error with stack trace
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
  }
}
