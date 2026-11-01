const { pool } = require('../config/db');

// One shape for every donation the API returns, whichever role is asking:
// the donation, who gave it, who is receiving and carrying it, and the first
// photo with its AI result.
const DONATION_SELECT = `
  SELECT d.*,
         dp.user_id AS donor_user_id, np.user_id AS ngo_user_id, vp.user_id AS volunteer_user_id,
         dp.business_name AS donor_name, dp.address AS donor_address,
         dp.latitude AS donor_lat, dp.longitude AS donor_lng, du.phone AS donor_phone,
         np.ngo_name, np.address AS ngo_address, np.latitude AS ngo_lat, np.longitude AS ngo_lng,
         vu.name AS volunteer_name, vu.phone AS volunteer_phone,
         img.image_url, img.ai_labels, img.ai_confidence,
         (SELECT COUNT(*) FROM donation_ngo_matches m
           WHERE m.donation_id = d.donation_id AND m.match_status = 'recommended') AS open_match_count
  FROM donations d
  JOIN donor_profiles dp ON dp.donor_id = d.donor_id
  JOIN users du ON du.user_id = dp.user_id
  LEFT JOIN ngo_profiles np ON np.ngo_id = d.assigned_ngo_id
  LEFT JOIN volunteer_profiles vp ON vp.volunteer_id = d.assigned_volunteer_id
  LEFT JOIN users vu ON vu.user_id = vp.user_id
  LEFT JOIN donation_images img ON img.image_id = (
    SELECT MIN(image_id) FROM donation_images WHERE donation_id = d.donation_id
  )
`;

async function create(conn, fields) {
  const [result] = await conn.query(
    `INSERT INTO donations
      (donor_id, food_type, food_category, storage_condition, diet_type, allergens,
       quantity_kg, prepared_at, expiry_estimate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      fields.donorId,
      fields.foodType,
      fields.foodCategory,
      fields.storageCondition,
      fields.dietType,
      fields.allergens || null,
      fields.quantityKg,
      fields.preparedAt,
      fields.expiryEstimate,
    ],
  );
  return result.insertId;
}

async function addImage(conn, donationId, imageUrl) {
  await conn.query('INSERT INTO donation_images (donation_id, image_url) VALUES (?, ?)', [donationId, imageUrl]);
}

async function findById(donationId, conn = pool) {
  const [rows] = await conn.query(`${DONATION_SELECT} WHERE d.donation_id = ?`, [donationId]);
  return rows[0] || null;
}

// Plain row, locked until the caller's transaction ends — for state changes that
// must not race (two volunteers claiming the same pickup at once).
async function lockById(conn, donationId) {
  const [rows] = await conn.query('SELECT * FROM donations WHERE donation_id = ? FOR UPDATE', [donationId]);
  return rows[0] || null;
}

async function listByDonor(donorId) {
  const [rows] = await pool.query(`${DONATION_SELECT} WHERE d.donor_id = ? ORDER BY d.created_at DESC`, [donorId]);
  return rows;
}

async function listByNgo(ngoId) {
  const [rows] = await pool.query(`${DONATION_SELECT} WHERE d.assigned_ngo_id = ? ORDER BY d.created_at DESC`, [ngoId]);
  return rows;
}

async function listByVolunteer(volunteerId) {
  const [rows] = await pool.query(
    `${DONATION_SELECT} WHERE d.assigned_volunteer_id = ? ORDER BY d.created_at DESC`,
    [volunteerId],
  );
  return rows;
}

async function listAwaitingVolunteer() {
  const [rows] = await pool.query(
    `${DONATION_SELECT}
     WHERE d.status = 'accepted' AND d.assigned_volunteer_id IS NULL AND d.expiry_estimate > NOW()
     ORDER BY d.expiry_estimate ASC`,
  );
  return rows;
}

async function getFirstImage(donationId) {
  const [rows] = await pool.query(
    'SELECT * FROM donation_images WHERE donation_id = ? ORDER BY image_id LIMIT 1',
    [donationId],
  );
  return rows[0] || null;
}

// A spoiled verdict also takes the donation out of circulation (status
// rejected), so it is never matched or shown to NGOs.
async function saveAiResult(donationId, imageId, { freshnessStatus, labels, confidence }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE donation_images SET ai_labels = ?, ai_confidence = ? WHERE image_id = ?', [
      JSON.stringify(labels),
      confidence,
      imageId,
    ]);
    await conn.query(
      `UPDATE donations
       SET freshness_status = ?, status = IF(? = 'spoiled', 'rejected', status)
       WHERE donation_id = ?`,
      [freshnessStatus, freshnessStatus, donationId],
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function markAccepted(conn, donationId, ngoId) {
  await conn.query("UPDATE donations SET status = 'accepted', assigned_ngo_id = ? WHERE donation_id = ?", [
    ngoId,
    donationId,
  ]);
}

async function markAssigned(conn, donationId, volunteerId) {
  await conn.query("UPDATE donations SET status = 'assigned', assigned_volunteer_id = ? WHERE donation_id = ?", [
    volunteerId,
    donationId,
  ]);
}

async function setStatus(conn, donationId, status) {
  await conn.query('UPDATE donations SET status = ? WHERE donation_id = ?', [status, donationId]);
}

async function recordImpact(conn, donationId, { co2SavedKg, mealsEquivalent }) {
  await conn.query('INSERT INTO carbon_logs (donation_id, co2_saved_kg, meals_equivalent) VALUES (?, ?, ?)', [
    donationId,
    co2SavedKg,
    mealsEquivalent,
  ]);
}

async function getImpactTotalsForDonor(donorId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS deliveries, COALESCE(SUM(c.co2_saved_kg), 0) AS co2_saved_kg,
            COALESCE(SUM(c.meals_equivalent), 0) AS meals
     FROM carbon_logs c JOIN donations d ON d.donation_id = c.donation_id
     WHERE d.donor_id = ?`,
    [donorId],
  );
  return rows[0];
}

module.exports = {
  create,
  addImage,
  markAccepted,
  markAssigned,
  setStatus,
  recordImpact,
  getImpactTotalsForDonor,
  findById,
  lockById,
  listByDonor,
  listByNgo,
  listByVolunteer,
  listAwaitingVolunteer,
  getFirstImage,
  saveAiResult,
};
