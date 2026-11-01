import api from '../services/api';

// Mirrors server/src/utils/shelfLife.util.js and donation.validator.js.
export const FOOD_CATEGORIES = ['cooked_meal', 'bakery', 'raw_produce', 'dairy', 'packaged'];
export const STORAGE_CONDITIONS = ['room_temp', 'hot_held', 'refrigerated'];
export const DIET_TYPES = ['veg', 'non_veg', 'jain', 'vegan'];

export function label(value) {
  if (!value) return '';
  const text = String(value).replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Uploaded photos are served by the API server at /uploads, outside /api.
export function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, api.defaults.baseURL).href;
}

export function timeLeft(expiry) {
  const ms = new Date(expiry).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours > 0) return `${hours}h ${minutes % 60}m left`;
  return `${minutes}m left`;
}

export function isUrgent(expiry) {
  return new Date(expiry).getTime() - Date.now() < 60 * 60 * 1000;
}

export function apiError(err, fallback) {
  return err.response?.data?.error || fallback;
}
