const { pool } = require('../config/database');

async function writeAuditLog({ company_id, user_id, action, target_table, target_id, detail, ip_address, user_agent }) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (company_id, user_id, action, target_table, target_id, detail, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id || null, user_id || null, action, target_table || null, target_id || null,
       detail ? JSON.stringify(detail) : null, ip_address || null, user_agent || null]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { writeAuditLog };
