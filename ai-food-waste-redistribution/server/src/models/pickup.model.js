const { pool } = require('../config/db');

async function create(conn, { donationId, volunteerId }) {
  // The hashes depend on pickup_id, which only exists after the insert, so the
  // row goes in with placeholders and is filled in by setCodeHashes right after
  // (same transaction).
  const [result] = await conn.query(
    'INSERT INTO pickup_verifications (donation_id, volunteer_id, qr_code_hash) VALUES (?, ?, UUID())',
    [donationId, volunteerId],
  );
  return result.insertId;
}

async function setCodeHashes(conn, pickupId, { pickupHash, deliveryHash }) {
  await conn.query('UPDATE pickup_verifications SET qr_code_hash = ?, delivery_code_hash = ? WHERE pickup_id = ?', [
    pickupHash,
    deliveryHash,
    pickupId,
  ]);
}

async function findByDonation(donationId, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM pickup_verifications WHERE donation_id = ?', [donationId]);
  return rows[0] || null;
}

async function markPickedUp(conn, pickupId) {
  await conn.query(
    "UPDATE pickup_verifications SET scanned_at = NOW(), verification_status = 'verified' WHERE pickup_id = ?",
    [pickupId],
  );
}

async function markDelivered(conn, pickupId) {
  await conn.query('UPDATE pickup_verifications SET delivery_scanned_at = NOW() WHERE pickup_id = ?', [pickupId]);
}

module.exports = { create, setCodeHashes, findByDonation, markPickedUp, markDelivered };
