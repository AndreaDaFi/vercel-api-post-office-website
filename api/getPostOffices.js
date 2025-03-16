import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const PORT = process.env.PORT || 5000;

// MySQL Connection Pool
const dbConfig = {
  host: process.env.DBHOST,
  user: process.env.DBUSER,
  password: process.env.DBPASS,
  database: process.env.DBNAME,
  ssl: process.env.DB_SSL_CA
    ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") }
    : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// ✅ GET: Fetch all post offices
// app.get("/api/getPostOffices", async (req, res) => {
//   try {
//     console.log("⏳ Fetching post office locations...");

//     const connection = await pool.getConnection();
//     const [rows] = await connection.execute(
//       `SELECT po.po_id, ad.street, s.state_name, ad.city_name 
//        FROM post_office AS po
//        JOIN address AS ad ON po.po_address_id = ad.address_id
//        JOIN state AS s ON ad.state_id = s.state_id`
//     );

//     connection.release();
//     console.log("✅ Post office locations fetched:", rows);
//     res.status(200).json({ success: true, data: rows });
//   } catch (error) {
//     console.error("❌ Error fetching post offices:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// ✅ POST: Add a new post office
// app.post("/api/addPostOffice", async (req, res) => {
//   const { state, city, street, zip } = req.body;

//   // Input validation
//   if (!state || !city || !street || !zip) {
//     return res.status(400).json({ success: false, error: "⚠ All fields are required." });
//   }
//   if (!/^[0-9]{5}$/.test(zip)) {
//     return res.status(400).json({ success: false, error: "⚠ Zip code must be 5 digits." });
//   }

//   try {
//     console.log("⏳ Adding new post office...");

//     const connection = await pool.getConnection();
//     await connection.execute(
//       `INSERT INTO address (street, city_name, zip, state_id) 
//        VALUES (?, ?, ?, (SELECT state_id FROM state WHERE state_name = ?))`,
//       [street, city, zip, state]
//     );

//     const [result] = await connection.execute(
//       `INSERT INTO post_office (po_address_id) 
//        VALUES (LAST_INSERT_ID())`
//     );

//     connection.release();
//     console.log("✅ Post office added with ID:", result.insertId);
//     res.status(201).json({ success: true, message: "✅ Post office added successfully!" });
//   } catch (error) {
//     console.error("❌ Error adding post office:", error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });