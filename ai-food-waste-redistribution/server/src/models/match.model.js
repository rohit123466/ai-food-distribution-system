const { pool } = require('../config/db');

// NGOs that could receive this donation: within the diet they accept and not
// already offered it before (uq_donation_ngo_matches_pair would reject a
// second row anyway — filtering here keeps a re-run of the matcher quiet).
async function findCandidateNgos(donationId, dietType) {
  const [rows] = await pool.query(
    `SELECT np.ngo_id, np.user_id, np.ngo_name, np.latitude, np.longitude,
            np.daily_capacity, np.current_demand_level
     FROM ngo_profiles np
     WHERE FIND_IN_SET(?, np.accepted_diets) > 0
       AND NOT EXISTS (
         SELECT 1 FROM donation_ngo_matches m WHERE m.donation_id = ? AND m.ngo_id = np.ngo_id
       )`,
    [dietType, donationId],
  );
  return rows;
}

async function createMany(donationId, matches) {
  if (matches.length === 0) return;
  const values = matches.map((m) => [donationId, m.ngoId, m.distanceKm, m.demandWeight, m.score, m.rank]);
  await pool.query(
    `INSERT INTO donation_ngo_matches
      (donation_id, ngo_id, distance_km, demand_weight, match_score, match_rank)
     VALUES ?`,
    [values],
  );
}

// Open offers for an NGO, with enough of the donation to decide on, hiding any
// whose food has passed its safe window or that another NGO already took.
async function listOpenForNgo(ngoId) {
  const [rows] = await pool.query(
    `SELECT m.match_id, m.distance_km, m.demand_weight, m.match_score, m.match_rank, m.created_at AS offered_at,
            d.donation_id, d.food_type, d.food_category, d.storage_condition, d.diet_type, d.allergens,
            d.quantity_kg, d.prepared_at, d.expiry_estimate, d.freshness_status,
            dp.business_name AS donor_name, dp.address AS donor_address,
            img.image_url, img.ai_confidence, img.ai_labels
     FROM donation_ngo_matches m
     JOIN donations d ON d.donation_id = m.donation_id
     JOIN donor_profiles dp ON dp.donor_id = d.donor_id
     LEFT JOIN donation_images img ON img.image_id = (
       SELECT MIN(image_id) FROM donation_images WHERE donation_id = d.donation_id
     )
     WHERE m.ngo_id = ? AND m.match_status = 'recommended'
       AND d.status = 'posted' AND d.expiry_estimate > NOW()
     ORDER BY d.expiry_estimate ASC, m.match_score DESC`,
    [ngoId],
  );
  return rows;
}

async function lockWithDonation(conn, matchId) {
  const [rows] = await conn.query(
    `SELECT m.*, d.status AS donation_status, d.freshness_status, d.expiry_estimate, d.donor_id, d.food_type
     FROM donation_ngo_matches m
     JOIN donations d ON d.donation_id = m.donation_id
     WHERE m.match_id = ?
     FOR UPDATE`,
    [matchId],
  );
  return rows[0] || null;
}

async function setStatus(conn, matchId, status) {
  await conn.query('UPDATE donation_ngo_matches SET match_status = ?, responded_at = NOW() WHERE match_id = ?', [
    status,
    matchId,
  ]);
}

// Once one NGO accepts, every other still-open offer for that donation lapses.
async function expireOthers(conn, donationId, acceptedMatchId) {
  await conn.query(
    `UPDATE donation_ngo_matches SET match_status = 'expired'
     WHERE donation_id = ? AND match_id <> ? AND match_status = 'recommended'`,
    [donationId, acceptedMatchId],
  );
}

module.exports = { findCandidateNgos, createMany, listOpenForNgo, lockWithDonation, setStatus, expireOthers };
