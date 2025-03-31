import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const {
      customer_id,
      first_name,
      last_name,
      email,
      phone,
      address
    } = req.body;

    if (!customer_id || !first_name || !last_name || !email || !phone || !address) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
      ssl: process.env.DB_SSL_CA ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') } : false,
    });

    console.log(`🔧 Updating profile for customer ID: ${customer_id}`);

    // Step 1: Get address_id of the customer
    const [customerRows] = await connection.execute(
      `SELECT address_id FROM customers WHERE customers_id = ?`,
      [customer_id]
    );

    if (customerRows.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const address_id = customerRows[0].address_id;

    // Step 2: Update customer info
    await connection.execute(
      `UPDATE customers 
       SET first_name = ?, last_name = ?, email = ?, phone = ? 
       WHERE customers_id = ?`,
      [first_name, last_name, email, phone, customer_id]
    );

    // Step 3: Update address info
    await connection.execute(
      `UPDATE address 
       SET street = ?, city_name = ?, state_id = ?, zip = ? 
       WHERE address_id = ?`,
      [address.street, address.city, address.state, address.zip, address_id]
    );

    await connection.end();

    console.log('✅ Customer profile updated!');
    return res.status(200).json({ success: true, message: 'Profile updated successfully' });

  } catch (error) {
    console.error('❌ API Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
