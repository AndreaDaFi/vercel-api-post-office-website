import mysql from "mysql2/promise"

export default async function handler(req, res) {
  // Headers para CORS - Configuración mejorada
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT")
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
      const { customer_id } = req.query

      if (!customer_id) {
        return res.status(400).json({ success: false, error: "customer_id is required" })
      }

      // Seleccionar SOLO mensajes no leídos (message_read = 0)
      const [messages] = await connection.execute(
        `SELECT cm.*, p.tracking_number, p.status, p.description
         FROM customer_messages cm
         LEFT JOIN packages p ON cm.packages_tracking_number = p.tracking_number
         WHERE cm.packages_customers_id = ?
         AND cm.message_read = 0`,
        [customer_id],
      )

      // Procesar los mensajes para agregar texto descriptivo
      const processedMessages = messages.map((msg) => {
        // Si el mensaje ya tiene contenido, lo dejamos como está
        if (msg.message) {
          return msg
        }

        // Para paquetes entregados, crear un mensaje descriptivo
        return {
          ...msg,
          message: `Tu paquete con número de seguimiento ${msg.tracking_number} ha sido entregado.`,
        }
      })

      await connection.end()
      return res.status(200).json({ success: true, messages: processedMessages })
    }

    // Endpoint para marcar mensajes como leídos
    if (req.method === "PUT") {
      const { message_ids } = req.body

      if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
        return res.status(400).json({ success: false, error: "message_ids array is required" })
      }

      // Convertir el array a una cadena de IDs separados por comas
      const messageIdsString = message_ids.join(",")

      // Actualizar los mensajes como leídos
      await connection.execute(
        `UPDATE customer_messages
         SET message_read = 1
         WHERE id IN (${messageIdsString})`,
      )

      await connection.end()
      return res.status(200).json({ success: true, message: "Messages marked as read" })
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" })
  } catch (error) {
    console.error("API error:", error)
    return res.status(500).json({ success: false, error: error.message })
  }
}

