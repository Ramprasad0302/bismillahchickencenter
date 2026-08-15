// Create or reset an admin user.
//   node scripts/createAdmin.js
//
// Replaces scripts/hashPassword.js, which hardcoded the password 'admin123'
// and silently did nothing if the target row did not exist.

const readline = require('readline');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const ask = (question, { hidden = false } = {}) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    if (hidden) {
      const onData = (char) => {
        if (['\n', '\r', '\u0004'].includes(char.toString())) {
          process.stdin.removeListener('data', onData);
        } else {
          process.stdout.write('\x1B[2K\x1B[200D' + question + '*'.repeat(rl.line.length));
        }
      };
      process.stdin.on('data', onData);
    }

    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });

const run = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const name = (await ask('Admin name [Mohammed Admin]: ')) || 'Mohammed Admin';
    const phone = (await ask('Phone [9999999999]: ')) || '9999999999';
    const password = await ask('Password: ', { hidden: true });

    if (!password || password.length < 8) {
      console.error('❌ Use at least 8 characters.');
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 10);

    const [existing] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);

    if (existing.length > 0) {
      await pool.query(
        `UPDATE users SET name = ?, password = ?, role = 'admin', status = 'active' WHERE id = ?`,
        [name, hash, existing[0].id]
      );
      console.log(`✅ Updated admin ${phone}`);
    } else {
      await pool.query(
        `INSERT INTO users (name, phone, password, role, status)
         VALUES (?, ?, ?, 'admin', 'active')`,
        [name, phone, hash]
      );
      console.log(`✅ Created admin ${phone}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();
