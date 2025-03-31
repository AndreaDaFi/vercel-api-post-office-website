import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // ✅ Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // ✅ Preflight response
  }

  if (req.method === 'POST') {
    const { po_id, startDate, endDate, statusUpdate, employeeRole, specificEmployee } = req.body;
    
    if (!po_id) {
      return res.status(400).json({ success: false, error: 'Valid po_id is required' });
    }

    try {
      console.log("⏳ Connecting to database...");
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA 
          ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
          : false,
        connectTimeout: 5000,
      });

      console.log("✅ Database connected!");

      const query = `
  SELECT 
    eu.my_row_id,
    e.first_name,
    e.role,
    eu.status_update_datetime,
    eu.previoust_status,
    eu.updated_status,
    p.type,
    CONCAT(a1.street, ', ', a1.city_name) AS originAddress,
    CONCAT(a2.street, ', ', a2.city_name) AS destinationAddress
  FROM 
    employees_updates_to_packages eu
  JOIN 
    employees e ON eu.employees_id = e.employees_id
  JOIN 
    packages p ON eu.tracking_number = p.tracking_number
  JOIN 
    address a1 ON p.origin_address_id = a1.address_id
  JOIN 
    address a2 ON p.destination_address_id = a2.address_id
  WHERE 
    p.po_id = ? 
    AND eu.status_update_datetime >= ? 
    AND eu.status_update_datetime <= ?
    AND (? = '' OR eu.updated_status = ?) 
    AND (? = '' OR e.role = ?) 
    AND (? = '' OR e.first_name = ?)
`;

      const totalQuery = `
  SELECT COUNT(*) AS totalRows
  FROM employees_updates_to_packages eu
  JOIN employees e ON eu.employees_id = e.employees_id
  JOIN packages p ON eu.tracking_number = p.tracking_number
  WHERE p.po_id = ?
  AND eu.status_update_datetime >= ? 
  AND eu.status_update_datetime <= ?
  AND (? = '' OR eu.updated_status = ?) 
  AND (? = '' OR e.role = ?) 
  AND (? = '' OR e.first_name = ?)
`;

const params = [
  po_id || 0,
  startDate ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ') : '1900-01-01 00:00:00',
  endDate ? new Date(endDate).toISOString().slice(0, 19).replace('T', ' ') : '2100-12-31 23:59:59',
  statusUpdate || '', statusUpdate || '',
  employeeRole || '', employeeRole || '',
  specificEmployee || '', specificEmployee || ''
];

const [rows] = await connection.execute(query, params);
const [totalRowsResult] = await connection.execute(totalQuery, params);

      await connection.end();
      console.log("✅ Query executed successfully!", rows);

      res.status(200).json({ success: true, data: rows, totalRows: totalRowsResult[0].totalRows });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else if (req.method === 'GET') {
    // New functionality to fetch employees based on po_id
    const po_id = req.query.po_id ? parseInt(req.query.po_id, 10) : null;
    
    if (!po_id) {
      return res.status(400).json({ success: false, error: 'Valid po_id is required' });
    }
    try {
      console.log("⏳ Fetching employees...");
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        ssl: process.env.DB_SSL_CA 
          ? { ca: Buffer.from(process.env.DB_SSL_CA, 'base64') }
          : false,
          connectTimeout: 5000,
      });

      const query = `
        SELECT employees_id AS id, first_name
        FROM employees
        WHERE po_id = ?
      `;
      
      const [rows] = await connection.execute(query, [po_id]);

      await connection.end();
      console.log("✅ Employees fetched successfully!");

      res.status(200).json({ success: true, employees: rows });
    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
