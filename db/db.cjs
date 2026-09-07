const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'HDM',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'SafePassword123!',
  port: parseInt(process.env.DB_PORT || '5000', 10),
  ssl: false,
  connectionTimeoutMillis: 5000
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ PostgreSQL Connection Error:', err.stack);
  }
  console.log(`✅ Connected to PostgreSQL Database on Port ${process.env.DB_PORT || 5000}`);
  release();
});

async function initDb() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY,
      cognito_sub VARCHAR(255) UNIQUE,
      name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'customer',
      layout JSONB DEFAULT '["builder", "tier", "projects", "invoices", "mixer", "settings"]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(50) PRIMARY KEY,
      user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'Pending Review',
      type VARCHAR(100),
      color VARCHAR(100),
      sqft INT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log('✅ PostgreSQL Schema Verified');
  } catch (err) {
    console.error('❌ Error initializing schema:', err.message);
  }
}

initDb();

module.exports = pool;
