const crypto = require('crypto');
const QRCode = require('qrcode');
const env = require('../config/env');

// No 0/O or 1/I, so a code read off a screen can be typed back without mistakes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

// Codes are derived (HMAC of the server secret + donation + purpose) rather than
// random, so only their SHA-256 hash needs storing in pickup_verifications and
// the donor/NGO can still re-open their QR at any time. Knowing a donation id is
// not enough to forge one without the secret.
function generateCode(purpose, donationId, pickupId) {
  const digest = crypto
    .createHmac('sha256', `handover:${env.jwt.secret}`)
    .update(`${purpose}:${donationId}:${pickupId}`)
    .digest();
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[digest[i] % ALPHABET.length];
  }
  return code;
}

function normalize(code) {
  return String(code || '').replace(/\s|-/g, '').toUpperCase();
}

function hashCode(code) {
  return crypto.createHash('sha256').update(normalize(code)).digest('hex');
}

function codeMatches(input, storedHash) {
  if (!storedHash) return false;
  const a = Buffer.from(hashCode(input), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function toQrDataUrl(code) {
  return QRCode.toDataURL(code, { margin: 1, width: 240 });
}

module.exports = { generateCode, hashCode, codeMatches, toQrDataUrl };
