import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormField, { inputClass } from '../../components/FormField.jsx';
import PlaceSearch from '../../components/PlaceSearch.jsx';
import { reverseGeocode } from '../../services/places';

function mapEmbedUrl(lat, lng) {
  const d = 0.006; // ~600 m either side of the pin
  const bbox = [lng - d, lat - d, lng + d, lat + d].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

// Mirrors server/src/validators/auth.validator.js — keep these in sync with the API contract.
const BUSINESS_TYPES = ['restaurant', 'hotel', 'bakery', 'grocery_store', 'household'];
const VEHICLE_TYPES = ['on_foot', 'bike', 'car', 'van'];
const DEMAND_LEVELS = ['low', 'medium', 'high'];
const DIET_TYPES = ['veg', 'non_veg', 'jain', 'vegan'];

const ROLE_DEFAULTS = {
  donor: { businessName: '', businessType: BUSINESS_TYPES[0], address: '', latitude: '', longitude: '' },
  ngo: {
    ngoName: '',
    registrationNumber: '',
    address: '',
    latitude: '',
    longitude: '',
    currentDemandLevel: 'medium',
    acceptedDiets: [...DIET_TYPES],
  },
  volunteer: { vehicleType: VEHICLE_TYPES[0] },
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('donor');
  const [common, setCommon] = useState({ name: '', email: '', password: '', phone: '' });
  const [roleFields, setRoleFields] = useState(ROLE_DEFAULTS.donor);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [pinnedPlace, setPinnedPlace] = useState('');

  function handleRoleChange(newRole) {
    setRole(newRole);
    setRoleFields(ROLE_DEFAULTS[newRole]);
    setPinnedPlace('');
    setLocationStatus('');
  }

  function handleCommonChange(e) {
    setCommon((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleRoleFieldChange(e) {
    setRoleFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleDiet(diet) {
    setRoleFields((prev) => ({
      ...prev,
      acceptedDiets: prev.acceptedDiets.includes(diet)
        ? prev.acceptedDiets.filter((d) => d !== diet)
        : [...prev.acceptedDiets, diet],
    }));
  }

  // Coordinates are never typed: they come from the picked place (or the
  // device's GPS) and are sent alongside the address the user can still edit.
  function applyPlace(place) {
    setRoleFields((prev) => ({
      ...prev,
      address: place.address,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
    }));
    setPinnedPlace(place.name);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by this browser.');
      return;
    }
    setLocationStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        // GeolocationCoordinates fields are prototype getters, so they can't be spread.
        const gpsOnly = { name: 'Your current location', address: '', latitude: coords.latitude, longitude: coords.longitude };
        try {
          const place = await reverseGeocode(coords.latitude, coords.longitude);
          applyPlace(place || gpsOnly);
          setLocationStatus(place ? '' : 'Location set. Type your full address below.');
        } catch {
          // GPS worked but the address lookup didn't: keep the pin, ask for the address.
          applyPlace(gpsOnly);
          setLocationStatus('Location set. Type your full address below.');
        }
      },
      () => setLocationStatus('Could not get your location. Search for it instead.'),
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if ('latitude' in roleFields && roleFields.latitude === '') {
      setError('Pick your location from the search results, or use your current location.');
      return;
    }
    setIsSubmitting(true);

    const payload = {
      ...common,
      phone: common.phone || undefined,
      role,
      ...roleFields,
    };
    if ('latitude' in roleFields) payload.latitude = Number(roleFields.latitude);
    if ('longitude' in roleFields) payload.longitude = Number(roleFields.longitude);

    try {
      await register(payload);
      navigate('/login', { state: { message: 'Registration successful — please log in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-gray-800">Create an account</h1>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="I am a..." id="role">
          <select id="role" value={role} onChange={(e) => handleRoleChange(e.target.value)} className={inputClass}>
            <option value="donor">Donor (restaurant, hotel, bakery, grocery store, household)</option>
            <option value="ngo">NGO</option>
            <option value="volunteer">Volunteer</option>
          </select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" id="name">
            <input
              id="name"
              name="name"
              required
              minLength={2}
              value={common.name}
              onChange={handleCommonChange}
              className={inputClass}
            />
          </FormField>
          <FormField label="Phone (optional)" id="phone">
            <input id="phone" name="phone" value={common.phone} onChange={handleCommonChange} className={inputClass} />
          </FormField>
        </div>

        <FormField label="Email" id="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={common.email}
            onChange={handleCommonChange}
            className={inputClass}
          />
        </FormField>

        <FormField label="Password" id="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={common.password}
            onChange={handleCommonChange}
            className={inputClass}
          />
        </FormField>

        <hr className="border-gray-200" />

        {role === 'donor' && (
          <>
            <FormField label="Business name" id="businessName">
              <input
                id="businessName"
                name="businessName"
                required
                value={roleFields.businessName}
                onChange={handleRoleFieldChange}
                className={inputClass}
              />
            </FormField>
            <FormField label="Business type" id="businessType">
              <select
                id="businessType"
                name="businessType"
                value={roleFields.businessType}
                onChange={handleRoleFieldChange}
                className={inputClass}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </FormField>
          </>
        )}

        {role === 'ngo' && (
          <>
            <FormField label="NGO name" id="ngoName">
              <input
                id="ngoName"
                name="ngoName"
                required
                value={roleFields.ngoName}
                onChange={handleRoleFieldChange}
                className={inputClass}
              />
            </FormField>
            <FormField label="Registration number" id="registrationNumber">
              <input
                id="registrationNumber"
                name="registrationNumber"
                required
                value={roleFields.registrationNumber}
                onChange={handleRoleFieldChange}
                className={inputClass}
              />
            </FormField>
            <FormField label="Current demand level" id="currentDemandLevel">
              <select
                id="currentDemandLevel"
                name="currentDemandLevel"
                value={roleFields.currentDemandLevel}
                onChange={handleRoleFieldChange}
                className={inputClass}
              >
                {DEMAND_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </FormField>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">Food we can accept</legend>
              <div className="mt-2 flex flex-wrap gap-4">
                {DIET_TYPES.map((diet) => (
                  <label key={diet} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={roleFields.acceptedDiets.includes(diet)}
                      onChange={() => toggleDiet(diet)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    {diet.replace('_', '-')}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {role === 'volunteer' && (
          <FormField label="Vehicle type" id="vehicleType">
            <select
              id="vehicleType"
              name="vehicleType"
              value={roleFields.vehicleType}
              onChange={handleRoleFieldChange}
              className={inputClass}
            >
              {VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {(role === 'donor' || role === 'ngo') && (
          <>
            <FormField label="Location" id="placeSearch">
              <PlaceSearch id="placeSearch" onSelect={applyPlace} />
            </FormField>

            <div>
              <button
                type="button"
                onClick={useMyLocation}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Use my current location
              </button>
              {locationStatus && <span className="ml-3 text-sm text-gray-500">{locationStatus}</span>}
            </div>

            {roleFields.latitude !== '' && (
              <>
                <div className="overflow-hidden rounded-md border">
                  <iframe
                    title="Selected location"
                    src={mapEmbedUrl(Number(roleFields.latitude), Number(roleFields.longitude))}
                    className="h-48 w-full"
                    loading="lazy"
                  />
                  <p className="bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                    Location set: {pinnedPlace}. Wrong spot? Search again for a closer landmark.
                  </p>
                </div>

                <FormField label="Full address (add shop, house or floor number)" id="address">
                  <input
                    id="address"
                    name="address"
                    required
                    value={roleFields.address}
                    onChange={handleRoleFieldChange}
                    className={inputClass}
                  />
                </FormField>
              </>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
