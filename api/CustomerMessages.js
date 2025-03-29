import mysql from "mysql2/promise"

export default async function handler(req, res) {
  // Headers para CORS y seguridad
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  res.setHeader("x-content-type-options", "nosniff")

  if (req.method === "OPTIONS") {
    return res.status(200).end() // CORS preflight
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

      // 1. Seleccionar SOLO mensajes no leídos (message_read = 0)
      const [messages] = await connection.execute(
        `SELECT cm.*, p.tracking_number, p.status, p.description
         FROM customer_messages cm
         LEFT JOIN packages p ON cm.packages_tracking_number = p.tracking_number
         WHERE cm.packages_customers_id = ?
         AND cm.message_read = 0`, // Solo mensajes con message_read = 0
        [customer_id],
      )

      // Procesar los mensajes para agregar texto descriptivo si no tienen mensaje
      const processedMessages = messages.map((msg) => {
        // Si el mensaje ya tiene contenido, lo dejamos como está
        if (msg.message) {
          return msg
        }

        // Si no tiene mensaje pero es un paquete entregado (del trigger), creamos un mensaje
        if (msg.status === "Delivered") {
          return {
            ...msg,
            message: `Tu paquete con número de seguimiento ${msg.tracking_number} ha sido entregado.`,
          }
        }

        // Para otros casos sin mensaje específico
        return {
          ...msg,
          message: `Actualización de estado para tu paquete: ${msg.status || "Estado actualizado"}`,
        }
      })

      // 2. Marcar los mensajes como leídos (message_read = 1)
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

