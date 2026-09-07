require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const db = require('./db/db.cjs');

const app = express();
const PORT = process.env.PORT || 3000;

const verifier = CognitoJwtVerifier.create({
  userPoolId: 'us-east-2_0KddUFn3N',
  tokenUse: 'id',
  clientId: '2el0nos2l424pm40sccol616b7',
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve component HTML files explicitly
app.use('/components', express.static(path.join(__dirname, 'components')));

async function authenticateCognitoToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = {
      sub: 'local-dev-user-id',
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'customer'
    };
    return next();
  }

  try {
    const payload = await verifier.verify(token);
    req.user = {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.email.split('@')[0],
      role: payload['custom:role'] || 'customer'
    };
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

// Render dynamic block component
app.get('/api/components/:name', (req, res) => {
  const componentName = req.params.name.replace(/[^a-zA-Z0-0_-]/g, '');
  const filePath = path.join(__dirname, 'components', `${componentName}.html`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send(`<div class="p-4 text-red-500">Component "${componentName}" not found.</div>`);
  }
});

// Dashboard Data API
app.get(['/api/customer/dashboard-data', '/api/customer/dashboard-data/:id'], authenticateCognitoToken, async (req, res) => {
  const { email, sub, name, role } = req.user;

  try {
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userRes.rows.length === 0) {
      userRes = await db.query(
        `INSERT INTO users (email, cognito_sub, name, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [email, sub, name, role]
      );
    }

    const user = userRes.rows[0];
    const projectsRes = await db.query(
      'SELECT id, title, status, type, color, sqft, notes FROM projects WHERE user_email = $1 ORDER BY created_at DESC',
      [email]
    );

    res.json({
      profile: { name: user.name, email: user.email },
      role: user.role,
      layout: user.layout,
      projects: projectsRes.rows,
      invoices: []
    });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Save Layout API
app.post(['/api/customer/layout', '/api/customer/layout/:id'], authenticateCognitoToken, async (req, res) => {
  const { email } = req.user;
  const { layout } = req.body;

  try {
    if (layout) {
      await db.query('UPDATE users SET layout = $1 WHERE email = $2', [JSON.stringify(layout), email]);
    }
    res.json({ success: true, layout });
  } catch (err) {
    console.error('Error saving layout:', err);
    res.status(500).json({ error: 'Failed to save layout state' });
  }
});

// Create Estimate API
app.post('/api/customer/estimates', authenticateCognitoToken, async (req, res) => {
  const { email } = req.user;
  const { title, type, color, sqft, notes } = req.body;

  const projectId = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const newProject = await db.query(
      `INSERT INTO projects (id, user_email, title, status, type, color, sqft, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, status, type, color, sqft, notes`,
      [projectId, email, title || 'New Paint Estimate', 'Pending Review', type || 'Interior Painting', color || 'N/A', sqft || 0, notes || '']
    );

    res.status(201).json({ success: true, project: newProject.rows[0] });
  } catch (err) {
    console.error('Error creating estimate:', err);
    res.status(500).json({ error: 'Failed to create project estimate' });
  }
});

app.listen(PORT, () => {
  console.log(`Customer Dashboard running at http://localhost:${PORT}`);
});
