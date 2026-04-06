const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { ensureAdminSchema } = require('../utils/adminSchema');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function buildAdminPayload(admin) {
  return {
    id: admin.id,
    role: 'admin',
  };
}

function buildAdminResponse(admin) {
  return {
    id: admin.id,
    school_name: admin.school_name,
    admin_name: admin.admin_name,
    name: admin.admin_name,
    login_id: admin.login_id,
    email: admin.email,
    role: 'admin',
    dashboardRoute: '/admin-dashboard',
  };
}

function looksLikeBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function comparePasswordAndRepairIfNeeded(connection, adminRecord, plainPassword) {
  const storedAdminPassword = adminRecord.password || '';
  const storedUserPassword = adminRecord.user_password || '';
  let passwordMatched = false;
  let repaired = false;

  if (looksLikeBcryptHash(storedAdminPassword)) {
    passwordMatched = await bcrypt.compare(plainPassword, storedAdminPassword);
  } else if (storedAdminPassword && storedAdminPassword === plainPassword) {
    passwordMatched = true;
    repaired = true;
  } else if (looksLikeBcryptHash(storedUserPassword)) {
    passwordMatched = await bcrypt.compare(plainPassword, storedUserPassword);
    if (passwordMatched && storedAdminPassword !== storedUserPassword) {
      repaired = true;
    }
  } else if (storedUserPassword && storedUserPassword === plainPassword) {
    passwordMatched = true;
    repaired = true;
  }

  if (passwordMatched && repaired) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await connection.execute('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, adminRecord.id]);
    if (adminRecord.user_id) {
      await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, adminRecord.user_id]);
    }
  }

  return { passwordMatched, repaired };
}

function validateRegistration(body) {
  const schoolName = normalizeText(body?.school_name);
  const adminName = normalizeText(body?.admin_name);
  const loginId = normalizeText(body?.login_id);
  const email = normalizeEmail(body?.email);
  const password = body?.password;

  if (!schoolName || !adminName || !loginId || !email || !password) {
    return { error: 'school_name, admin_name, login_id, email, and password are required' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long' };
  }

  return {
    schoolName,
    adminName,
    loginId,
    email,
    password,
  };
}

async function registerAdmin(req, res) {
  let connection;
  try {
    const debugPayload = {
      school_name: normalizeText(req.body?.school_name),
      admin_name: normalizeText(req.body?.admin_name),
      login_id: normalizeText(req.body?.login_id),
      email: normalizeEmail(req.body?.email),
      passwordProvided: Boolean(req.body?.password),
    };
    console.info('[ADMIN_AUTH][REGISTER] Incoming payload', debugPayload);

    await ensureAdminSchema();
    const validated = validateRegistration(req.body);
    console.info('[ADMIN_AUTH][REGISTER] Validation result', {
      valid: !validated.error,
      schoolName: validated.schoolName,
      adminName: validated.adminName,
      loginId: validated.loginId,
      email: validated.email,
    });
    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      `SELECT id, username, email, role
       FROM users
       WHERE email = ? OR username = ?
       LIMIT 5`,
      [validated.email, validated.loginId]
    );
    const [existingRows] = await connection.execute(
      `SELECT id, login_id, email
       FROM admins
       WHERE login_id = ? OR email = ?`,
      [validated.loginId, validated.email]
    );

    if (existingUsers.length > 0 || existingRows.length > 0) {
      const duplicate = existingRows.some((row) => row.login_id === validated.loginId)
        || existingUsers.some((row) => row.username === validated.loginId)
        ? 'Admin login ID already exists'
        : 'Admin email already exists';
      await connection.rollback();
      return res.status(409).json({ success: false, message: duplicate });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    await connection.execute(
      `INSERT INTO users (username, email, password, role)
       VALUES (?, ?, ?, 'admin')`,
      [validated.loginId, validated.email, hashedPassword]
    );
    const [insertResult] = await connection.execute(
      `INSERT INTO admins (school_name, admin_name, login_id, email, password)
       VALUES (?, ?, ?, ?, ?)`,
      [validated.schoolName, validated.adminName, validated.loginId, validated.email, hashedPassword]
    );

    await connection.commit();
    console.info('[ADMIN_AUTH][REGISTER] Admin registered successfully', {
      adminId: insertResult.insertId,
      loginId: validated.loginId,
      email: validated.email,
    });

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: insertResult.insertId,
        school_name: validated.schoolName,
        admin_name: validated.adminName,
        login_id: validated.loginId,
        email: validated.email,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('[ADMIN_AUTH][REGISTER] SQL/Server error', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({
      success: false,
      message: error.code === 'ER_DUP_ENTRY' ? 'Admin already exists' : 'Failed to register admin',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function loginAdmin(req, res) {
  let connection;
  try {
    await ensureAdminSchema();
    const identifier = normalizeText(req.body?.login_id || req.body?.identifier);
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    console.info('[ADMIN_AUTH][LOGIN] Attempt', {
      identifier,
      passwordProvided: Boolean(password),
    });

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'login_id or email and password are required' });
    }

    const normalizedIdentifier = normalizeEmail(identifier);
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT
         a.id,
         a.school_name,
         a.admin_name,
         a.login_id,
         a.email,
         a.password,
         a.created_at,
         u.id AS user_id,
         u.username,
         u.email AS user_email,
         u.password AS user_password,
         u.role AS user_role
       FROM admins a
       LEFT JOIN users u
         ON u.email = a.email OR u.username = a.login_id
       WHERE a.login_id = ? OR a.email = ? OR u.username = ? OR u.email = ?
       LIMIT 1`,
      [identifier, normalizedIdentifier, identifier, normalizedIdentifier]
    );

    if (rows.length === 0) {
      console.info('[ADMIN_AUTH][LOGIN] Admin lookup result', { found: false, identifier });
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const admin = rows[0];
    console.info('[ADMIN_AUTH][LOGIN] Admin lookup result', {
      found: true,
      adminId: admin.id,
      loginId: admin.login_id,
      email: admin.email,
      userId: admin.user_id || null,
      userRole: admin.user_role || null,
    });

    if (admin.user_role && String(admin.user_role).trim().toLowerCase() !== 'admin') {
      console.info('[ADMIN_AUTH][LOGIN] Role mismatch', {
        adminId: admin.id,
        storedRole: admin.user_role,
      });
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const { passwordMatched, repaired } = await comparePasswordAndRepairIfNeeded(connection, admin, password);
    console.info('[ADMIN_AUTH][LOGIN] Password verification', {
      adminId: admin.id,
      passwordMatched,
      repairedHash: repaired,
    });

    if (!passwordMatched) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(buildAdminPayload(admin), process.env.JWT_SECRET, { expiresIn: '24h' });
    console.info('[ADMIN_AUTH][LOGIN] JWT generated', {
      adminId: admin.id,
      tokenIssued: Boolean(token),
    });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: buildAdminResponse(admin),
      admin: buildAdminResponse(admin),
      redirectTo: '/admin-dashboard',
    });
  } catch (error) {
    console.error('[ADMIN_AUTH][LOGIN] SQL/Server error', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
    });
    return res.status(500).json({ success: false, message: 'Failed to login admin', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function getAdminProfile(req, res) {
  try {
    await ensureAdminSchema();
    const [rows] = await pool.execute(
      `SELECT id, school_name, admin_name, login_id, email, created_at
       FROM admins
       WHERE id = ?
       LIMIT 1`,
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    return res.status(200).json({
      success: true,
      admin: buildAdminResponse(rows[0]),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin profile', error: error.message });
  }
}

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
};
