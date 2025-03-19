import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Set custom headers for CORS and content-type options
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DBHOST,
      user: process.env.DBUSER,
      password: process.env.DBPASS,
      database: process.env.DBNAME,
    });

    if (req.method === 'GET') {
      // Fetch Post Offices by State
      const { state } = req.query;
      if (!state) {
        return res.status(400).json({ success: false, error: 'State is required' });
      }

      const query = `
        SELECT po.po_id, addr.street, addr.city_name, addr.zip
        FROM post_office po
        JOIN address addr ON po.po_address_id = addr.address_id
        WHERE addr.state_id = ?
      `;
      const [rows] = await connection.execute(query, [state]);

      await connection.end();
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      // Insert Package and Transaction Details
      const {
        receiverName,
        receiverStreet,
        receiverApartment,
        receiverCity,
        receiverState,
        receiverZip,
        weight,
        status,
        customersId,
        originAddressId,
        purchasedInsurance,
        fastDelivery,
        fragile,
        poId,
        type,
        totalAmount,
        transactionDate,
        totalTax,
      } = req.body;

      // Validate input data
      if (
        !receiverName ||
        !receiverStreet ||
        !receiverCity ||
        !receiverState ||
        !receiverZip ||
        !weight ||
        !status ||
        !customersId ||
        !originAddressId ||
        !poId ||
        !type ||
        !totalAmount ||
        !transactionDate ||
        !totalTax
      ) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }

      // Start transaction
      await connection.beginTransaction();

      try {
        // Insert into address table for the receiver's address
        const addressQuery = `
          INSERT INTO address (street, street2, apt, city_name, state_id, zip)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [addressResult] = await connection.execute(addressQuery, [
          receiverStreet,
          receiverApartment || null,
          null,
          receiverCity,
          receiverState,
          receiverZip,
        ]);
        
        const receiverAddressId = addressResult.insertId;

        // Insert into packages table
        const packagesQuery = `
          INSERT INTO packages (
            weight, status, customers_id, origin_address_id, destination_address_id,
            purchased_insurance, fast_delivery, fragile, po_id, receiver_name, type
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [packageResult] = await connection.execute(packagesQuery, [
          weight,
          status,
          customersId,
          originAddressId,
          receiverAddressId,
          purchasedInsurance ? 'Y' : 'N',
          fastDelivery ? 'Y' : 'N',
          fragile ? 'Y' : 'N',
          poId,
          receiverName,
          type,
        ]);

        const trackingNumber = packageResult.insertId; // Get the tracking number of the package

        // Insert into transactions table
        const transactionsQuery = `
          INSERT INTO transactions (
            total_amount, transaction_date, total_tax, customers_id_fk,
            packages_tracking_number, po_id
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        await connection.execute(transactionsQuery, [
          totalAmount,
          transactionDate,
          totalTax,
          customersId,
          trackingNumber,
          poId,
        ]);

        // Commit transaction
        await connection.commit();
        
        await connection.end();

        return res.status(201).json({ success: true, trackingNumber });
      } catch (error) {
        // Rollback transaction on error
        await connection.rollback();
        
        throw error;
      }
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
