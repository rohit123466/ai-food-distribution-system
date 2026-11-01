const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');

const AI_TIMEOUT_MS = 15000;

// Sends a stored donation photo to the FastAPI service. Returns null instead of
// throwing when the service is down or errors: per the Section 7 NFR a donation
// must still be saved (as freshness "pending") when the AI service is
// unavailable, and the donor can retry the check later.
async function analyzeImage(filePath, mimeType) {
  try {
    const bytes = await fs.readFile(filePath);
    const form = new FormData();
    form.append('image', new Blob([bytes], { type: mimeType }), path.basename(filePath));

    const res = await fetch(`${env.aiServiceUrl}/analyze`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`AI service returned ${res.status} for ${path.basename(filePath)}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`AI service unavailable: ${err.message}`);
    return null;
  }
}

module.exports = { analyzeImage };
