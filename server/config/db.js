const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  // A JSON body like {"phone": {"phone": 1}} would otherwise be expanded by
  // mysql2 into `phone = `phone` = 1` (always true). Turning objects into
  // strings closes that injection trick for every query in the app.
  stringifyObjects: true
});

module.exports = pool;