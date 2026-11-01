import { useEffect, useState } from 'react';
import api from '../../services/api';
import usePolling from '../../hooks/usePolling';
import StatusBadge from '../../components/StatusBadge.jsx';
import CodeEntry from '../../components/CodeEntry.jsx';
import { apiError, isUrgent, label, timeLeft } from '../../utils/format';

function mapsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function ActiveTask({ task: t, onChanged }) {
  async function verify(step, code) {
    const { data } = await api.post(`/tasks/${t.donation_id}/${step}`, { code });
    onChanged(
      data.task.impact
        ? `Delivered #${t.donation_id}: about ${data.task.impact.mealsEquivalent} meals for ${t.ngo_name}. Thank you!`
        : `Pickup of #${t.donation_id} verified. Now take it to ${t.ngo_name}.`,
    );
  }

  const atPickup = t.status === 'assigned';

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-800">
          #{t.donation_id} · {t.quantity_kg} kg · {t.food_type}
        </span>
        <StatusBadge value={t.status} />
        <span className={`text-sm ${isUrgent(t.expiry_estimate) ? 'font-medium text-red-700' : 'text-gray-500'}`}>
          {timeLeft(t.expiry_estimate)}
        </span>
      </div>

      <ol className="mt-3 space-y-1 text-sm">
        <li className={atPickup ? 'text-gray-800' : 'text-gray-400 line-through'}>
          1. Collect from <span className="font-medium">{t.donor_name}</span>, {t.donor_address}
          {t.donor_phone && ` · ${t.donor_phone}`}{' '}
          {atPickup && (
            <a href={mapsLink(t.donor_lat, t.donor_lng)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
              directions
            </a>
          )}
        </li>
        <li className={atPickup ? 'text-gray-500' : 'text-gray-800'}>
          2. Deliver to <span className="font-medium">{t.ngo_name}</span>, {t.ngo_address} ({t.trip_km} km){' '}
          {!atPickup && (
            <a href={mapsLink(t.ngo_lat, t.ngo_lng)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
              directions
            </a>
          )}
        </li>
      </ol>

      <p className="mt-3 text-sm text-gray-600">
        {atPickup ? "Scan the donor's pickup QR when you collect the food:" : "Scan the NGO's delivery QR when you hand it over:"}
      </p>
      <CodeEntry
        key={t.status}
        submitLabel={atPickup ? 'Confirm pickup' : 'Confirm delivery'}
        onSubmit={(code) => verify(atPickup ? 'pickup' : 'deliver', code)}
      />
    </li>
  );
}

function AvailableTask({ task: t, onClaimed }) {
  const [error, setError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  async function claim() {
    setIsClaiming(true);
    setError('');
    try {
      await api.post(`/tasks/${t.donation_id}/claim`);
      onClaimed();
    } catch (err) {
      setError(apiError(err, 'Could not claim this pickup.'));
      onClaimed();
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-gray-800">
            {t.quantity_kg} kg · {t.food_type}
          </span>
          <span className={`ml-2 text-sm ${isUrgent(t.expiry_estimate) ? 'font-medium text-red-700' : 'text-gray-500'}`}>
            {timeLeft(t.expiry_estimate)}
          </span>
          <p className="mt-1 text-sm text-gray-500">
            {t.donor_name} → {t.ngo_name} · {t.trip_km} km trip
            {t.to_pickup_km !== null && ` · pickup ${t.to_pickup_km} km from you`} · {label(t.storage_condition)}
          </p>
        </div>
        <button
          onClick={claim}
          disabled={isClaiming}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isClaiming ? 'Claiming...' : "I'll take it"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  );
}

export default function VolunteerWorkspace() {
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [flash, setFlash] = useState('');

  const mine = usePolling(() => api.get('/tasks/mine').then((res) => res.data.tasks));
  const available = usePolling(() =>
    api.get('/tasks/available', { params: location || {} }).then((res) => res.data.tasks),
  );

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by this browser.');
      return;
    }
    setLocationStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('Sorted by distance from you.');
      },
      () => setLocationStatus('Could not get your location.'),
    );
  }

  const { reload: reloadAvailable } = available;
  useEffect(() => {
    if (location) reloadAvailable();
  }, [location, reloadAvailable]);

  function refreshBoth(message) {
    if (typeof message === 'string') setFlash(message);
    mine.reload();
    available.reload();
  }

  const tasks = mine.data || [];
  const active = tasks.filter((t) => ['assigned', 'picked_up'].includes(t.status));
  const completed = tasks.filter((t) => t.status === 'delivered');

  return (
    <div className="space-y-6">
      {flash && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash}</p>}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Your active pickups</h2>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">None. Pick one from the list below.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((t) => (
              <ActiveTask key={t.donation_id} task={t} onChanged={refreshBoth} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Pickups needing a volunteer</h2>
          <div className="text-sm">
            <button onClick={useMyLocation} className="font-medium text-emerald-700 hover:underline">
              Sort by distance from me
            </button>
            {locationStatus && <span className="ml-2 text-gray-500">{locationStatus}</span>}
          </div>
        </div>
        {available.error && <p className="mt-2 text-sm text-red-700">{available.error}</p>}
        {(available.data || []).length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No pickups waiting right now.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {available.data.map((t) => (
              <AvailableTask key={t.donation_id} task={t} onClaimed={refreshBoth} />
            ))}
          </ul>
        )}
      </div>

      {completed.length > 0 && (
        <p className="text-sm text-gray-500">
          You have completed {completed.length} deliver{completed.length === 1 ? 'y' : 'ies'}. Thank you!
        </p>
      )}
    </div>
  );
}
