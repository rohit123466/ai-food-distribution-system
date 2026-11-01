const { pool } = require('../config/db');

async function create({ userId, donationId = null, type, message }, conn = pool) {
  await conn.query('INSERT INTO notifications (user_id, donation_id, message, type) VALUES (?, ?, ?, ?)', [
    userId,
    donationId,
    message,
    type,
  ]);
}

async function listForUser(userId, limit = 20) {
  const [rows] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY sent_at DESC, notification_id DESC LIMIT ?',
    [userId, limit],
  );
  return rows;
}

async function markAllRead(userId) {
  await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [userId]);
}

module.exports = { create, listForUser, markAllRead };
