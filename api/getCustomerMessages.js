// 🔹 DELETE: Marcar todos como leídos para ese cliente (opcional si usas dismiss uno por uno)
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const customer_id = pathParts[pathParts.length - 1];

  if (!customer_id || customer_id === "customer-messages") {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Missing customer ID." }, { status: 400 })
    );
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
    });

    const [updated] = await connection.execute(
      `UPDATE customer_messages SET is_read = 1 WHERE customer_id = ? AND is_read = 0`,
      [customer_id]
    );

    await connection.end();

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: `${(updated as any).affectedRows} messages marked as read.`,
      })
    );
  } catch (err: any) {
    console.error("❌ Server error:", err.message);
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    );
  }
}
