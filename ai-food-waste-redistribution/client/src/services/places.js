// Place search and reverse geocoding via Photon (photon.komoot.io), a free
// OpenStreetMap geocoder built for search-as-you-type — no API key or billing.
// Plain fetch, not the axios `api` instance: that one attaches our JWT, which
// must never be sent to a third-party host.
const PHOTON_URL = 'https://photon.komoot.io';

// Results are restricted to India (minLon, minLat, maxLon, maxLat) and ranked
// nearest-to-Delhi first, where the platform currently operates, so "Saket"
// finds South Delhi before a same-named place in another state. Other cities
// still come up when typed by name.
const INDIA_BBOX = '68.1,6.5,97.4,35.7';
const BIAS = { lat: '28.6139', lon: '77.2090', location_bias_scale: '0.1', zoom: '10' };

function formatPlace(properties) {
  const parts = [
    properties.name,
    properties.housenumber && properties.street ? `${properties.housenumber} ${properties.street}` : properties.street,
    properties.locality,
    properties.district,
    properties.city || properties.county,
    properties.state,
    properties.postcode,
  ];
  // OSM often repeats the same name at several levels (e.g. name and district).
  return [...new Set(parts.filter(Boolean))].join(', ');
}

function toPlace(feature) {
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    id: `${feature.properties.osm_type}${feature.properties.osm_id}`,
    name: feature.properties.name || feature.properties.street || 'Unnamed place',
    address: formatPlace(feature.properties),
    latitude,
    longitude,
  };
}

export async function searchPlaces(query, signal) {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en', bbox: INDIA_BBOX, ...BIAS });
  const res = await fetch(`${PHOTON_URL}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();
  return data.features.map(toPlace);
}

export async function reverseGeocode(latitude, longitude) {
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude), lang: 'en' });
  const res = await fetch(`${PHOTON_URL}/reverse?${params}`);
  if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status})`);
  const data = await res.json();
  if (!data.features.length) return null;
  // Keep the exact GPS point; only borrow the address text.
  return { ...toPlace(data.features[0]), latitude, longitude };
}
