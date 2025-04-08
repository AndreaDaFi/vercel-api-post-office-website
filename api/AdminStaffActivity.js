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
          e.role, e.po_id,
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
      `;

      // Query for all hours worked
      const hoursQuery = `
        SELECT 
    e.first_name,
    e.role, e.po_id,
    h.date,
    SUM(h.hours) as total_hours,
    (SELECT COUNT(*) FROM employees_updates_to_packages eu 
     WHERE eu.employees_id = e.employees_id) as package_updates
FROM 
    hours h
JOIN 
    employees e ON h.employees_id = e.employees_id
GROUP BY 
    e.employees_id, e.first_name, e.role, h.date
      `;

      // Query for employees list
      const employeesQuery = `
        SELECT employees_id AS id, first_name, role, po_id
        FROM employees
      `;

      const [packageRows] = await connection.execute(packageQuery);
      const [hoursRows] = await connection.execute(hoursQuery);
      const [employeesRows] = await connection.execute(employeesQuery);

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
