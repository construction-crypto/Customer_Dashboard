const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Initialize Cognito JWT Verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID || 'MyWebAppClient'
});

// Auth Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = await verifier.verify(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
  }
}

app.use(cors({
  origin: [
    'https://construction.seemoneyproductions.com',
    'http://localhost:3000',
    'http://localhost:4000'
  ],
  credentials: true
}));
app.use(express.json());

// Health Check (Public)
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT current_database(), inet_server_port();');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: dbResult.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Protected Customer Profile Route
app.get('/api/customer/profile', authenticateToken, async (req, res) => {
  try {
    const { sub, email } = req.user;
    let customer = await pool.query('SELECT * FROM customers WHERE cognito_sub = \;', [sub]);

    // First time login auto-provisioning
    if (customer.rows.length === 0) {
      const newCustomer = await pool.query(
        'INSERT INTO customers (cognito_sub, email) VALUES (\, \) RETURNING *;',
        [sub, email]
      );
      customer = newCustomer;
      await pool.query('INSERT INTO user_preferences (customer_id) VALUES (\);', [customer.rows[0].id]);
    }

    res.json(customer.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
