// ============================================
// Authentication Routes
// ============================================
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Demo users (in production, these would be in a database)
const users = [
  {
    id: 'USR001',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    name: 'Administrator'
  },
  {
    id: 'USR002',
    username: 'operator',
    password: bcrypt.hashSync('operator123', 10),
    role: 'operator',
    name: 'Operator POS'
  }
];

// Active tokens tracking (for logout)
const activeTokens = new Set();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    activeTokens.add(token);

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    activeTokens.delete(token);
  }
  res.json({ message: 'Logout successful' });
});

// GET /auth/me
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /auth/users (admin only)
router.get('/users', (req, res) => {
  const safeUsers = users.map(u => ({
    id: u.id, username: u.username, role: u.role, name: u.name
  }));
  res.json(safeUsers);
});

module.exports = router;
