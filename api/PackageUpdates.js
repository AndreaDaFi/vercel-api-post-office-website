import mysql from "mysql2/promise"

export default async function handler(req, res) {
  // Headers para CORS - Configuración mejorada
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Max-Age", "86400") // 24 horas
  res.setHeader("x-content-type-options", "nosniff")

  // Manejar la solicitud preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    })

    if (req.method === "GET") {
      const { customer_id, tracking_number } = req.query

      if (!customer_id) {
        return res.status(400).json({ success: false, error: "customer_id is required" })
      }

      let query = `
        SELECT * FROM employees_updates_to_packages 
        WHERE customers_id = ?
      `

      const queryParams = [customer_id]

      // Si se proporciona un número de seguimiento, filtrar por él también
      if (tracking_number) {
        query += " AND tracking_number = ?"
        queryParams.push(tracking_number)
      }

      // Ordenar por fecha de actualización, más reciente primero
      query += " ORDER BY status_update_datetime DESC"

      const [updates] = await connection.execute(query, queryParams)

      await connection.end()
      return res.status(200).json({ success: true, updates })
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
}

