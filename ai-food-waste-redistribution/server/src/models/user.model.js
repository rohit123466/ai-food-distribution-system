const { pool } = require('../config/db');

const PROFILE_TABLES = {
  donor: 'donor_profiles',
  ngo: 'ngo_profiles',
  volunteer: 'volunteer_profiles',
};

async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(userId) {
  const [rows] = await pool.query(
    'SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id = ?',
    [userId],
  );
  return rows[0] || null;
}

async function getProfileByRole(role, userId) {
  const table = PROFILE_TABLES[role];
  if (!table) return null;
  const [rows] = await pool.query(`SELECT * FROM ${table} WHERE user_id = ?`, [userId]);
  return rows[0] || null;
}

// Creates the users row and its role-specific profile row in one transaction, so a
// donation-blocking half-registered account (a user with no profile) can never exist.
async function createUserWithProfile({ name, email, passwordHash, phone, role }, profileData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, phone || null, role],
    );
    const userId = userResult.insertId;

    if (role === 'donor') {
      const { businessName, businessType, address, latitude, longitude } = profileData;
      await conn.query(
        `INSERT INTO donor_profiles
          (user_id, business_name, business_type, address, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, businessName, businessType, address, latitude, longitude],
      );
    } else if (role === 'ngo') {
      const {
        ngoName,
        registrationNumber,
        address,
        latitude,
        longitude,
        dailyCapacity = 0,
        currentDemandLevel = 'medium',
        acceptedDiets = ['veg', 'non_veg', 'jain', 'vegan'],
      } = profileData;
      await conn.query(
        `INSERT INTO ngo_profiles
          (user_id, ngo_name, registration_number, address, latitude, longitude, daily_capacity,
           current_demand_level, accepted_diets)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          ngoName,
          registrationNumber,
          address,
          latitude,
          longitude,
          dailyCapacity,
          currentDemandLevel,
          acceptedDiets.join(','),
        ],
      );
    } else if (role === 'volunteer') {
      const { vehicleType, isAvailable = true, currentLat = null, currentLng = null } = profileData;
      await conn.query(
        `INSERT INTO volunteer_profiles
          (user_id, vehicle_type, is_available, current_lat, current_lng)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, vehicleType, isAvailable, currentLat, currentLng],
      );
    }

    await conn.commit();
    return userId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { findByEmail, findById, getProfileByRole, createUserWithProfile };
