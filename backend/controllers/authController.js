const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

function dashboardPathForRole(role) {
  if (role === 'admin') return '/admin-dashboard';
  return role === 'issuer' ? '/issuer-dashboard' : '/student-dashboard';
}

// Get profile ID from role-specific table
async function getProfileIdByRole(connection, userId, role) {
  if (role === 'issuer') {
    const [rows] = await connection.execute('SELECT id FROM issuers WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0]?.id || null;
  }
  if (role === 'student') {
    const [rows] = await connection.execute('SELECT id FROM students WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0]?.id || null;
  }
  return null;
}

function profileTableForRole(role) {
  if (role === 'issuer') return 'issuers';
  if (role === 'student') return 'students';
  return null;
}

// REGISTER
async function register(req, res) {
  let connection;
  try {
    const { name, username, email, password, role } = req.body || {};
    const normalizedName = (name || username || '').trim();
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedRole = (role || 'student').trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!['issuer', 'student'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Role must be issuer or student' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check if email already exists in users table
    const [existing] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into users
    const [userInsert] = await connection.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [normalizedName, normalizedEmail, hashedPassword, normalizedRole]
    );
    const userId = userInsert.insertId;

    // Insert into role-specific table with user_id
    if (normalizedRole === 'issuer') {
      await connection.execute(
        'INSERT INTO issuers (user_id, name, email, password) VALUES (?, ?, ?, ?)',
        [userId, normalizedName, normalizedEmail, hashedPassword]
      );
    } else {
      await connection.execute(
        'INSERT INTO students (user_id, name, email, password) VALUES (?, ?, ?, ?)',
        [userId, normalizedName, normalizedEmail, hashedPassword]
      );
    }

    await connection.commit();

    const profileId = await getProfileIdByRole(connection, userId, normalizedRole);
    const token = jwt.sign({ userId, username: normalizedName, role: normalizedRole, profileId }, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: { id: userId, username: normalizedName, email: normalizedEmail, role: normalizedRole, profileId, dashboardRoute: dashboardPathForRole(normalizedRole) },
      token,
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('[AUTH][REGISTER] ERROR:', error);
    return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  } finally {
    if (connection) connection.release();
  }
}

// LOGIN
async function login(req, res) {
  try {
    const { email, password, role } = req.body || {};
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedRole = (role || '').trim().toLowerCase();

    if (!normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    const tableName = profileTableForRole(normalizedRole);
    if (!tableName) {
      return res.status(400).json({ success: false, message: 'Role must be issuer or student' });
    }

    const query = `SELECT id AS profile_id, user_id, name, email, password FROM ${tableName} WHERE email = ? LIMIT 1`;
    const [rows] = await pool.execute(query, [normalizedEmail]);
    const user = rows[0];

    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Wrong password' });

    const token = jwt.sign({ userId: user.user_id, username: user.name, role: normalizedRole, profileId: user.profile_id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      role: normalizedRole,
      token,
      user: { id: user.user_id, name: user.name, email: user.email, role: normalizedRole, profileId: user.profile_id, dashboardRoute: dashboardPathForRole(normalizedRole) },
    });

  } catch (error) {
    console.error('[AUTH][LOGIN] ERROR:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}

// ME
async function me(req, res) {
  try {
    const { role, userId, adminId, id } = req.user;
    if (role === 'admin') {
      const [adminRows] = await pool.execute(
        `SELECT id, school_name, admin_name, login_id
         FROM admins
         WHERE id = ?
         LIMIT 1`,
        [adminId || id]
      );
      const admin = adminRows[0];
      if (!admin) return res.status(404).json({ message: 'Admin not found' });

      return res.status(200).json({
        user: {
          id: admin.id,
          username: admin.admin_name,
          adminName: admin.admin_name,
          schoolName: admin.school_name,
          loginId: admin.login_id,
          role: 'admin',
          dashboardRoute: dashboardPathForRole('admin'),
        },
      });
    }

    const tableName = profileTableForRole(role);
    if (!tableName) {
      return res.status(400).json({ message: 'Role must be issuer or student' });
    }

    const [rows] = await pool.execute(`SELECT id AS profile_id, user_id, name, email FROM ${tableName} WHERE user_id = ? LIMIT 1`, [userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ user: { id: user.user_id, username: user.name, email: user.email, role, dashboardRoute: dashboardPathForRole(role) } });
  } catch (error) {
    console.error('[AUTH][ME] ERROR:', error);
    return res.status(500).json({ message: 'Failed to fetch user profile', error: error.message });
  }
}

module.exports = { register, login, me };
