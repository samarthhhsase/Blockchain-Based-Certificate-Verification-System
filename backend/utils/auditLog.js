const pool = require('../db');

async function logAudit({
  userId = null,
  action,
  certificateId = null,
  oldData = null,
  newData = null,
}) {
  if (!action) {
    return;
  }

  await pool.execute(
    `INSERT INTO audit_logs (user_id, action, certificate_id, old_data, new_data)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      certificateId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    ]
  );
}

module.exports = { logAudit };
