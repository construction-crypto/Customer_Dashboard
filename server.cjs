const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(cors({
  origin: [
    'https://construction.seemoneyproductions.com',
    'http://localhost:3000',
    'http://localhost:4000'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT current_database(), inet_server_port();');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbResult.rows[0]
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Get All Projects for Dashboard
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC;');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Project Details
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = ;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create New Customer Project
app.post('/api/projects', async (req, res) => {
  const { title, description, status, total_amount } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO projects (title, description, status, total_amount) VALUES (, , , ) RETURNING *;',
      [title, description, status || 'Pending', total_amount || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(Server running on port \);
});
