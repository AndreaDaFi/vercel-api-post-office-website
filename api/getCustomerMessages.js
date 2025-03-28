import { NextRequest, NextResponse } from "next/server";
import mysql from "mysql2/promise";

// CORS Headers
function setCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCorsHeaders(response);
}

// 🔹 GET unread messages for a customer
export async function GET(request: NextRequest) {
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

    const [messages] = await connection.execute(
      `SELECT m.id, m.message, m.created_at, m.is_read, m.customer_id, m.package_id,
              p.tracking_number, p.status,
              COALESCE(oa.state, 'Unknown') AS origin_state,
              COALESCE(CONCAT(da.address, ', ', da.city, ' ', da.state, ' ', da.zip), 'Unknown') AS destination_address
       FROM customer_messages m
       LEFT JOIN packages p ON m.package_id = p.id
       LEFT JOIN addresses oa ON p.packages_origin_address_id = oa.id
       LEFT JOIN addresses da ON p.packages_destination_address_id = da.id
       WHERE m.customer_id = ? AND m.is_read = 0 AND m.is_deleted = 0
       ORDER BY m.created_at DESC`,
      [customer_id]
    );

    await connection.end();

    return setCorsHeaders(NextResponse.json({ success: true, messages }));
  } catch (err: any) {
    console.error("❌ Server error:", err.message);
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    );
  }
}

// 🔹 PUT: Mark message as read
export async function PUT(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const customer_id = pathParts[pathParts.length - 1];

  if (!customer_id || customer_id === "customer-messages") {
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Missing customer ID." }, { status: 400 })
    );
  }

  try {
    const body = await request.json();
    const messageId = body.messageId;

    if (!messageId) {
      return setCorsHeaders(
        NextResponse.json({ success: false, error: "Missing message ID." }, { status: 400 })
      );
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, "base64") } : false,
    });

    const [updated] = await connection.execute(
      `UPDATE customer_messages SET is_read = 1 WHERE id = ? AND customer_id = ?`,
      [messageId, customer_id]
    );

    await connection.end();

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: "Message marked as read.",
        updatedCount: (updated as any).affectedRows,
      })
    );
  } catch (err: any) {
    console.error("❌ Server error:", err.message);
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    );
  }
}

// 🔹 DELETE: Permanently delete messages for a customer
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

    const [deleted] = await connection.execute(
      `DELETE FROM customer_messages WHERE customer_id = ?`,
      [customer_id]
    );

    await connection.end();

    return setCorsHeaders(
      NextResponse.json({
        success: true,
        message: `${(deleted as any).affectedRows} messages permanently deleted.`,
        deletedCount: (deleted as any).affectedRows,
      })
    );
  } catch (err: any) {
    console.error("❌ Server error:", err.message);
    return setCorsHeaders(
      NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
    );
  }
}
