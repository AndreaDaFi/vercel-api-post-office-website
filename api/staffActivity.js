import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const { po_id, startDate, endDate, employeeRole, specificEmployee } = req.body;
    
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

      // Query for package updates
      const packageQuery = `
        SELECT 
          eu.my_row_id,
          e.first_name,
          e.role,
          eu.status_update_datetime,
          eu.previoust_status,
          eu.updated_status,
          p.type
        FROM 
          employees_updates_to_packages eu
        JOIN 
          employees e ON eu.employees_id = e.employees_id
        JOIN 
          packages p ON eu.tracking_number = p.tracking_number
        WHERE 
          e.po_id = ? 
          AND eu.status_update_datetime >= ? 
          AND eu.status_update_datetime <= ?
          AND (? = '' OR e.role = ?) 
          AND (? = '' OR e.first_name = ?)
      `;

      // Query for hours worked
      const hoursQuery = `
        SELECT 
          e.first_name,
          e.role,
          h.date,
          SUM(h.hours) as total_hours,
          (SELECT COUNT(*) FROM employees_updates_to_packages eu 
           WHERE eu.employees_id = e.employees_id 
           AND eu.status_update_datetime >= ? 
           AND eu.status_update_datetime <= ?) as package_updates
        FROM 
          hours h
        JOIN 
          employees e ON h.employees_id = e.employees_id
        WHERE 
          h.po_id = ? 
          AND h.date >= ? 
          AND h.date <= ?
          AND (? = '' OR e.role = ?) 
          AND (? = '' OR e.first_name = ?)
        GROUP BY 
          e.first_name, e.role, h.date
      `;

      const totalQuery = `
        SELECT COUNT(*) AS totalRows
        FROM employees_updates_to_packages eu
        JOIN employees e ON eu.employees_id = e.employees_id
        JOIN packages p ON eu.tracking_number = p.tracking_number
        WHERE e.po_id = ?
        AND eu.status_update_datetime >= ? 
        AND eu.status_update_datetime <= ?
        AND (? = '' OR e.role = ?) 
        AND (? = '' OR e.first_name = ?)
      `;

      const params = [
        po_id || 0,
        startDate ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ') : '1900-01-01 00:00:00',
        endDate ? new Date(endDate).toISOString().slice(0, 19).replace('T', ' ') : '2100-12-31 23:59:59',
        employeeRole || '', employeeRole || '',
        specificEmployee || '', specificEmployee || ''
      ];

      const hoursParams = [
        startDate ? new Date(startDate).toISOString().slice(0, 19).replace('T', ' ') : '1900-01-01 00:00:00',
        endDate ? new Date(endDate).toISOString().slice(0, 19).replace('T', ' ') : '2100-12-31 23:59:59',
        po_id || 0,
        startDate ? new Date(startDate).toISOString().slice(0, 10) : '1900-01-01',
        endDate ? new Date(endDate).toISOString().slice(0, 10) : '2100-12-31',
        employeeRole || '', employeeRole || '',
        specificEmployee || '', specificEmployee || ''
      ];

      const [packageRows] = await connection.execute(packageQuery, params);
      const [hoursRows] = await connection.execute(hoursQuery, hoursParams);
      const [totalRowsResult] = await connection.execute(totalQuery, params);

      await connection.end();
      console.log("✅ Queries executed successfully!");

      res.status(200).json({ 
        success: true, 
        data: packageRows, 
        hoursData: hoursRows,
        totalRows: totalRowsResult[0].totalRows 
      });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else if (req.method === 'GET') {
    // Fetch employees based on po_id
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
