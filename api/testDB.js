async function testDB() {
    try {
      const sslCA = Buffer.from(process.env.DB_SSL_CA, 'base64');
      console.log("⏳ Connecting to Azure MySQL...");
      const connection = await mysql.createConnection({
        host: process.env.DBHOST,
        user: process.env.DBUSER,
        password: process.env.DBPASS,
        database: process.env.DBNAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: {
            ca: sslCA, // Provide the certificate for SSL connection
        }
    });
  
      console.log("✅ Database connection successful!");
      const [rows] = await connection.execute('SELECT NOW() AS now;');
      console.log("🕒 Database Time:", rows[0].now);
  
      await connection.end();
    } catch (error) {
      console.error("❌ Database connection failed:", error.message);
    }
  }
  
  testDB();