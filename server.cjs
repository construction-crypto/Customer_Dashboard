const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const checkoutNodeJSSdk = require('@paypal/checkout-server-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function paypalEnvironment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  return process.env.PAYPAL_MODE === 'live'
    ? new checkoutNodeJSSdk.core.LiveEnvironment(clientId, clientSecret)
    : new checkoutNodeJSSdk.core.SandboxEnvironment(clientId, clientSecret);
}

function paypalClient() {
  return new checkoutNodeJSSdk.core.PayPalHttpClient(paypalEnvironment());
}

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID
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

app.use(cors({
  origin: [
    'https://construction.seemoneyproductions.com',
    'http://localhost:3000',
    'http://localhost:4000'
  ],
  credentials: true
}));
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

// Public Endpoint to serve PayPal Client ID to frontend SDK
app.get('/api/config/paypal', (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
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

// Create PayPal Order
app.post('/api/paypal/create-order', authenticateToken, async (req, res) => {
  const { invoiceId, amount } = req.body;
  const request = new checkoutNodeJSSdk.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: parseFloat(amount || 100.00).toFixed(2)
      },
      custom_id: invoiceId
    }]
  });

  try {
    const order = await paypalClient().execute(request);
    res.status(201).json({ orderID: order.result.id });
  } catch (err) {
    console.error('PayPal Order Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Capture PayPal Order
app.post('/api/paypal/capture-order', authenticateToken, async (req, res) => {
  const { orderID, invoiceId } = req.body;
  const { sub } = req.user;

  try {
    const customerResult = await pool.query('SELECT id FROM customers WHERE cognito_sub = \;', [sub]);
    if (customerResult.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

    const request = new checkoutNodeJSSdk.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    const capture = await paypalClient().execute(request);

    const captureDetails = capture.result.purchase_units[0].payments.captures[0];
    const amountPaid = captureDetails.amount.value;

    await pool.query(
      \INSERT INTO payments (customer_id, paypal_order_id, amount, currency, status, payment_method, metadata)
       VALUES (\, \, \, 'USD', \, 'PayPal', \);\,
      [customerResult.rows[0].id, orderID, amountPaid, capture.result.status, JSON.stringify(capture.result)]
    );

    res.json({ status: 'SUCCESS', capture: capture.result });
  } catch (err) {
    console.error('PayPal Capture Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
