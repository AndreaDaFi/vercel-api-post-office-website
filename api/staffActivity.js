import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const { po_id } = req.query;
    
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

      // Query for all package updates
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
      `;

      // Query for all hours worked
      const hoursQuery = `
        SELECT 
    e.first_name,
    e.role,
    h.date,
    SUM(h.hours) as total_hours,
    (SELECT COUNT(*) FROM employees_updates_to_packages eu 
     WHERE eu.employees_id = e.employees_id) as package_updates
FROM 
    hours h
JOIN 
    employees e ON h.employees_id = e.employees_id
WHERE 
    h.po_id = ?
GROUP BY 
    e.employees_id, e.first_name, e.role, h.datee
      `;

      // Query for employees list
      const employeesQuery = `
        SELECT employees_id AS id, first_name, role
        FROM employees
        WHERE po_id = ?
      `;

      const [packageRows] = await connection.execute(packageQuery, [po_id]);
      const [hoursRows] = await connection.execute(hoursQuery, [po_id]);
      const [employeesRows] = await connection.execute(employeesQuery, [po_id]);

      await connection.end();
      console.log("✅ Queries executed successfully!");

      res.status(200).json({ 
        success: true, 
        data: packageRows, 
        hoursData: hoursRows,
        employees: employeesRows,
        totalRows: packageRows.length 
      });

    } catch (error) {
      console.error("❌ API Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
