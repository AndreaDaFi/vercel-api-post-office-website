import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow only the specific frontend
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (CORS pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // Respond with status 200 for OPTIONS request
  }

  // Handle POST requests
  if (req.method === "POST") {
    const {
      cart,
      customers_id,
      customers_address_id,
      purchased_insurance,
      fast_delivery,
      total_amount,
      total_tax,
      po_id
    } = req.body;

    let connection;

    try {
      console.log("Incoming request body:", req.body); // Log incoming request body

      console.log("⏳ Connecting to database with params:", {
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        database: process.env.DBNAME
      });

      connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      await connection.beginTransaction();

      const lowStockItems = [];

      // Check stock before processing
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        const [rows] = await connection.query(
          'SELECT stock FROM items_for_sale WHERE item_id = ?',
          [item.id]
        );

        const stock = rows[0]?.stock;
        if (stock < item.quantity) {
          await connection.rollback();
          await connection.end();
          return res.status(400).json({
            success: false,
            message: `Not enough stock . Available: ${stock}, requested: ${item.quantity}`
          });
        }

        const remainingStock = stock - item.quantity;
        if (remainingStock < 5) {
          lowStockItems.push({ itemId: item.id, remainingStock });
        }
      }

      // Insert package
      const [packageResult] = await connection.query(
        `INSERT INTO packages (weight, status, customers_id, origin_address_id, destination_address_id, 
                                purchased_insurance, fast_delivery, fragile, po_id, receiver_name, type, size)
         VALUES (?, 'In Transit', ?, 
                 (SELECT po_address_id FROM post_office WHERE po_id = ?), ?, ?, ?, '0', ?, 
                 (SELECT first_name FROM customers WHERE customers_id = ?), NULL, NULL)`,
        [null, customers_id, po_id, customers_address_id, purchased_insurance, fast_delivery, po_id, customers_id]
      );
      const tracking_number = packageResult.insertId;

      // Insert transaction
      const [transactionResult] = await connection.query(
        `INSERT INTO transactions (total_amount, transaction_date, total_tax, customers_id_fk, packages_tracking_number, po_id)
         VALUES (?, NOW(), ?, ?, ?, ?)`,
        [total_amount, total_tax, customers_id, tracking_number, po_id]
      );
      const transaction_id = transactionResult.insertId;

      // Insert purchased items and update stock
      for (let i = 0; i < cart.length; i++) {
        const item = cart[i];

        await connection.query(
          `INSERT INTO item_purchased (transactions_id, item_id, item_amount_purchased)
           VALUES (?, ?, ?)`,
          [transaction_id, item.id, item.quantity]
        );

        await connection.query(
          `UPDATE items_for_sale SET stock = stock - ? WHERE item_id = ?`,
          [item.quantity, item.id]
        );
      }

      // Commit transaction
      await connection.commit();
      console.log("✅ Transaction committed!");

      await connection.end();
      console.log("✅ Database connection closed.");

      res.status(200).json({
        success: true,
        message: "Checkout processed successfully!",
        lowStockItems
      });

    } catch (error) {
      console.error("❌ API Error:", error);
      if (connection) {
        await connection.rollback();
        await connection.end();
      }
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
