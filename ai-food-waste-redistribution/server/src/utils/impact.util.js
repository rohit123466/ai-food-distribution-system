// Per-kg factors behind carbon_logs. These are the same ratios the seeded rows
// in database/seeds/002_seed_sample_data.sql were computed with (45 kg ->
// 112.5 kg CO2e, 90 meals), so new and seeded deliveries are comparable.
const CO2_KG_PER_FOOD_KG = 2.5;
const MEALS_PER_FOOD_KG = 2;

function computeImpact(quantityKg) {
  const kg = Number(quantityKg);
  return {
    co2SavedKg: Number((kg * CO2_KG_PER_FOOD_KG).toFixed(3)),
    mealsEquivalent: Number((kg * MEALS_PER_FOOD_KG).toFixed(2)),
  };
}

module.exports = { computeImpact };
