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
      const { customer_id, status } = req.query

      if (!customer_id) {
        return res.status(400).json({ success: false, error: "customer_id is required" })
      }

      // Consulta base
      let query = `
        SELECT cm.*, p.tracking_number, p.status, p.description,
               eu.previous_status, eu.updated_status, eu.status_update_datetime
        FROM customer_messages cm
        LEFT JOIN packages p ON cm.packages_tracking_number = p.tracking_number
        LEFT JOIN employees_updates_to_packages eu ON p.tracking_number = eu.tracking_number
        WHERE cm.packages_customers_id = ?
        AND cm.message_read = 0
      `

      const queryParams = [customer_id]

      // Filtrar por estado si se proporciona
      if (status) {
        query += " AND p.status = ?"
        queryParams.push(status)
      }

      // Ordenar por fecha de actualización, más reciente primero
      query += " ORDER BY eu.status_update_datetime DESC"

      const [messages] = await connection.execute(query, queryParams)

      // Procesar los mensajes para agregar texto descriptivo
      const processedMessages = messages.map((msg) => {
        // Si el mensaje ya tiene contenido, lo dejamos como está
        if (msg.message) {
          return msg
        }

        // Para paquetes entregados
        if (msg.status === "Delivered") {
          return {
            ...msg,
            message: `Tu paquete con número de seguimiento ${msg.tracking_number} ha sido entregado.`,
          }
        }

        // Para otros estados
        return {
          ...msg,
          message: `Tu paquete con número de seguimiento ${msg.tracking_number} ha cambiado de estado: ${msg.previous_status || "Estado anterior"} → ${msg.updated_status || msg.status}`,
        }
      })

      // Marcar los mensajes como leídos (message_read = 1)
      if (messages.length > 0) {
        // Extraer los IDs de los mensajes para actualizarlos
        const messageIds = messages.map((msg) => msg.id).join(",")

        if (messageIds) {
          await connection.execute(
            `UPDATE customer_messages
             SET message_read = 1
             WHERE id IN (${messageIds})`,
          )
        }
      }

      await connection.end()
      return res.status(200).json({ success: true, messages: processedMessages })
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
}

