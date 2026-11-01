// Safe-to-serve window, in hours from prepared_at, per food category and how it
// is being stored. Deliberately conservative (closer to food-safety guidance
// than to what kitchens tend to assume) because the cost of a too-short window
// is a missed donation, while the cost of a too-long one is someone getting ill.
const SHELF_LIFE_HOURS = {
  cooked_meal: { room_temp: 4, hot_held: 6, refrigerated: 48 },
  bakery: { room_temp: 24, hot_held: 8, refrigerated: 72 },
  raw_produce: { room_temp: 48, hot_held: 4, refrigerated: 120 },
  dairy: { room_temp: 4, hot_held: 2, refrigerated: 48 },
  packaged: { room_temp: 72, hot_held: 24, refrigerated: 168 },
};

const FOOD_CATEGORIES = Object.keys(SHELF_LIFE_HOURS);
const STORAGE_CONDITIONS = ['room_temp', 'hot_held', 'refrigerated'];

function computeExpiry(preparedAt, foodCategory, storageCondition) {
  const hours = SHELF_LIFE_HOURS[foodCategory][storageCondition];
  return new Date(new Date(preparedAt).getTime() + hours * 60 * 60 * 1000);
}

module.exports = { computeExpiry, FOOD_CATEGORIES, STORAGE_CONDITIONS, SHELF_LIFE_HOURS };
