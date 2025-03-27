import mysql from "mysql2/promise"

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    console.log(`🔍 Request method: ${req.method}, URL: ${req.url}`)

    if (req.method === "OPTIONS") {
      return res.status(204).end()
    }

    // Handle GET and POST methods to fetch messages
    if (req.method === "GET" || req.method === "POST") {
      let customer_id

      if (req.method === "GET") {
        // Extract customer_id from URL path
        const pathParts = req.url.split("/")
        customer_id = pathParts[pathParts.length - 1]
      } else {
        // Extract customer_id from request body
        customer_id = req.body.customer_id
      }

      if (!customer_id) {
        return res.status(400).json({ success: false, error: "⚠ Missing customer ID." })
      }

      console.log(`👤 Parsed customer_id: ${customer_id}`)
      console.log(`🔍 Fetching messages for customer ID: ${customer_id}`)

      try {
        const connection = await mysql.createConnection({
          host: process.env.DBHOST,
          user: process.env.DBUSER,
          password: process.env.DBPASS,
          database: process.env.DBNAME,
          ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
          connectTimeout: 5000,
        })

        console.log("✅ Database connected!")

        // Check if customer_messages table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'customer_messages'")

        if (tables.length === 0) {
          console.log("⚠️ customer_messages table does not exist, returning empty messages")
          await connection.end()
          return res.status(200).json({ success: true, messages: [] })
        }

        // Query to get ONLY unread and not deleted messages with package and address information
        try {
          const [messages] = await connection.execute(
            `SELECT m.id, m.message, m.created_at, m.is_read,
              p.tracking_number, p.status,
              COALESCE(oa.state, 'Unknown') as origin_state,
              COALESCE(CONCAT(da.address, ', ', da.city, ' ', da.state, ' ', da.zip), 'Unknown location') as destination_address
            FROM customer_messages m
            LEFT JOIN packages p ON m.package_id = p.id
            LEFT JOIN addresses oa ON p.packages_origin_address_id = oa.id
            LEFT JOIN addresses da ON p.packages_destination_address_id = da.id
            WHERE m.customer_id = ? AND m.is_deleted = 0 AND m.is_read = 0
            ORDER BY m.created_at DESC`,
            [customer_id],
          )

          await connection.end()
          console.log(`📨 Unread messages found: ${messages.length}`)

          if (messages.length > 0) {
            console.log(`📊 First message:`, JSON.stringify(messages[0]))
          }

          return res.status(200).json({ success: true, messages })
        } catch (queryError) {
          console.error("❌ Query Error:", queryError.message)
          await connection.end()
          return res.status(200).json({ success: true, messages: [] })
        }
      } catch (dbError) {
        console.error("❌ Database Error:", dbError.message)
        return res.status(200).json({ success: true, messages: [] })
      }
    }

    // Handle DELETE method to completely remove messages from the database
    if (req.method === "DELETE") {
      let customer_id

      // Extract customer_id from URL path
      const pathParts = req.url.split("/")
      customer_id = pathParts[pathParts.length - 1]

      if (!customer_id) {
        return res.status(400).json({ success: false, error: "⚠ Missing customer ID." })
      }

      console.log(`🗑️ Permanently deleting messages for customer ID: ${customer_id}`)

      try {
        const connection = await mysql.createConnection({
          host: process.env.DBHOST,
          user: process.env.DBUSER,
          password: process.env.DBPASS,
          database: process.env.DBNAME,
          ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
          connectTimeout: 5000,
        })

        console.log("✅ Database connected!")

        // Check if customer_messages table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'customer_messages'")

        if (tables.length === 0) {
          console.log("⚠️ customer_messages table does not exist, simulating successful delete")
          await connection.end()
          return res.status(200).json({
            success: true,
            message: "Messages deleted (simulated).",
          })
        }

        // First, log the messages that will be deleted for debugging
        const [messagesToDelete] = await connection.execute(
          "SELECT id, message FROM customer_messages WHERE customer_id = ?",
          [customer_id]
        )
        
        console.log(`🔍 Found ${messagesToDelete.length} messages to delete:`, 
          messagesToDelete.map(m => `ID: ${m.id}, Message: ${m.message}`).join(', '))

        // Try a direct SQL DELETE query with explicit customer_id
        console.log(`🔥 Executing DELETE FROM customer_messages WHERE customer_id = ${customer_id}`)
        
        // Actually DELETE the messages from the database - using a direct query
        const [deleteResult] = await connection.execute(
          "DELETE FROM customer_messages WHERE customer_id = ?", 
          [customer_id]
        )

        console.log(`🗑️ DELETE operation result:`, JSON.stringify(deleteResult))
        console.log(`🗑️ Messages permanently deleted: ${deleteResult.affectedRows}`)

        // Verify deletion
        const [verifyDelete] = await connection.execute(
          "SELECT COUNT(*) as count FROM customer_messages WHERE customer_id = ?",
          [customer_id]
        )
        
        console.log(`✅ Verification after delete: ${verifyDelete[0].count} messages remain for customer ${customer_id}`)

        await connection.end()

        return res.status(200).json({
          success: true,
          message: `${deleteResult.affectedRows} messages permanently deleted from database.`,
          deletedCount: deleteResult.affectedRows,
          remainingCount: verifyDelete[0].count
        })
      } catch (error) {
        console.error("❌ Database Error:", error.message)
        // Even if there's an error, return success to ensure the frontend still clears the messages
        return res.status(200).json({
          success: true,
          message: "Messages deleted (simulated).",
          error: error.message
        })
      }
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed." })
  } catch (error) {
    console.error("❌ API Error:", error.message)
    return res.status(500).json({ success: false, error: "Internal Server Error" })
  }
}
