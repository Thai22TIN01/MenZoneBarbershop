const sql = require("mssql");

const config = {
  user: "menzone_user",                 // user SQL của bạn
  password: "123456",         // mật khẩu SQL
  server: "DINHTHAI-PC",      // tên máy (đúng như SSMS)
  database: "MenZoneBarber",  // tên database
  options: {
    trustServerCertificate: true,
  },
};

module.exports = async function connectDB() {
  return sql.connect(config);
};

async function connectDB() {
  try {
    const pool = await sql.connect(config);
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1); // Exit if database connection fails
  }
}

module.exports = connectDB;