const matchModel = require('../models/match.model');
const configModel = require('../models/config.model');
const notificationModel = require('../models/notification.model');
const { haversineKm } = require('../utils/geo.util');

// demand_weight values stored on each match row. high/medium match the seeded
// rows (1.00 / 0.60).
const DEMAND_WEIGHTS = { high: 1.0, medium: 0.6, low: 0.3 };

// score = distance_weight * (1 - distance / max_radius) + demand_weight * demand
// Both components are 0-1, so with weights summing to 1 the score is 0-1 too.
// Stored per row (distance_km, demand_weight, match_score) so the NGO feed can
// show exactly why each NGO was picked.
function scoreMatch(distanceKm, demandLevel, config) {
  const distanceComponent = Math.max(0, 1 - distanceKm / config['recommendation.max_radius_km']);
  const demandWeight = DEMAND_WEIGHTS[demandLevel] ?? DEMAND_WEIGHTS.medium;
  const score =
    config['recommendation.distance_weight'] * distanceComponent + config['recommendation.demand_weight'] * demandWeight;
  return { distanceComponent, demandWeight, score };
}

function rankCandidates(donorLocation, candidates, config) {
  return candidates
    .map((ngo) => {
      const distanceKm = haversineKm(
        Number(donorLocation.latitude),
        Number(donorLocation.longitude),
        Number(ngo.latitude),
        Number(ngo.longitude),
      );
      return { ngo, distanceKm, ...scoreMatch(distanceKm, ngo.current_demand_level, config) };
    })
    .filter((c) => c.distanceKm <= config['recommendation.max_radius_km'])
    .sort((a, b) => b.score - a.score)
    .slice(0, config['recommendation.max_candidates'])
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// Offers a fresh donation to the best-scoring nearby NGOs and notifies them.
// Returns how many NGOs it was offered to (0 = nobody in range accepts this diet).
async function recommendNgos(donation) {
  const config = await configModel.getNumbers();
  const candidates = await matchModel.findCandidateNgos(donation.donation_id, donation.diet_type);
  const ranked = rankCandidates(
    { latitude: donation.donor_lat, longitude: donation.donor_lng },
    candidates,
    config,
  );

  await matchModel.createMany(
    donation.donation_id,
    ranked.map((c) => ({
      ngoId: c.ngo.ngo_id,
      distanceKm: c.distanceKm.toFixed(2),
      demandWeight: c.demandWeight.toFixed(2),
      score: c.score.toFixed(3),
      rank: c.rank,
    })),
  );

  for (const c of ranked) {
    await notificationModel.create({
      userId: c.ngo.user_id,
      donationId: donation.donation_id,
      type: 'match',
      message: `New donation ${c.distanceKm.toFixed(1)} km away: ${donation.quantity_kg} kg of ${donation.food_type}.`,
    });
  }
  return ranked.length;
}

module.exports = { recommendNgos, scoreMatch, rankCandidates };
