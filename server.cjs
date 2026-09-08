const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-2_0KddUFn3N',
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID || 'dummy_client_id'
});

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

const allowedOrigins = [
  'https://construction.seemoneyproductions.com',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:5500'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Public Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT current_database(), inet_server_port();');
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: dbResult.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Protected Dashboard Data Endpoint
app.get('/api/dashboard-data', authenticateToken, async (req, res) => {
  try {
    const { sub } = req.user;
    const customerResult = await pool.query('SELECT * FROM customers WHERE cognito_sub = \;', [sub]);
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Customer profile not found' });
    }

    const customer = customerResult.rows[0];
    const projects = await pool.query('SELECT * FROM projects WHERE customer_id = \ ORDER BY created_at DESC;', [customer.id]);
    const preferences = await pool.query('SELECT * FROM user_preferences WHERE customer_id = \;', [customer.id]);
    const payments = await pool.query('SELECT * FROM payments WHERE customer_id = \ ORDER BY created_at DESC;', [customer.id]);

    res.json({
      customer,
      projects: projects.rows,
      preferences: preferences.rows[0] || {},
      payments: payments.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(Server running on port );
});
