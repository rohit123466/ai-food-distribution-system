import { useState } from 'react';
import api from '../../services/api';
import usePolling from '../../hooks/usePolling';
import StatusBadge from '../../components/StatusBadge.jsx';
import AiVerdict from '../../components/AiVerdict.jsx';
import QrCodePanel from '../../components/QrCodePanel.jsx';
import { apiError, imageUrl, isUrgent, label, timeLeft } from '../../utils/format';

const DEMAND_NAMES = { '1.00': 'high', '0.60': 'medium', '0.30': 'low' };

function MatchCard({ match: m, onResponded }) {
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  async function respond(action) {
    setIsBusy(true);
    setError('');
    try {
      await api.post(`/matches/${m.match_id}/${action}`);
      onResponded();
    } catch (err) {
      setError(apiError(err, `Could not ${action} this donation.`));
      onResponded();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <li className="flex gap-4 rounded-lg border bg-white p-4">
      {m.image_url && (
        <img src={imageUrl(m.image_url)} alt={m.food_type} className="h-20 w-20 flex-none rounded-md object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-800">
            {m.quantity_kg} kg · {m.food_type}
          </span>
          <span className={`text-sm ${isUrgent(m.expiry_estimate) ? 'font-medium text-red-700' : 'text-gray-500'}`}>
            {timeLeft(m.expiry_estimate)}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          From {m.donor_name} · {label(m.food_category)} · {label(m.diet_type)} · {label(m.storage_condition)}
          {m.allergens && <span className="text-amber-700"> · Allergens: {m.allergens}</span>}
        </p>
        <div className="mt-1">
          <AiVerdict freshness={m.freshness_status} aiLabels={m.ai_labels} />
        </div>
        <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Why you:</span> ranked #{m.match_rank} · {m.distance_km} km away ·
          your demand is {DEMAND_NAMES[m.demand_weight] || m.demand_weight} · match score {Number(m.match_score).toFixed(2)}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => respond('accept')}
            disabled={isBusy}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Accept
          </button>
          <button
            onClick={() => respond('reject')}
            disabled={isBusy}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </li>
  );
}

function IncomingCard({ donation: d }) {
  return (
    <li className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-gray-800">
          #{d.donation_id} · {d.quantity_kg} kg · {d.food_type}
        </span>
        <StatusBadge value={d.status} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        From {d.donor_name}, {d.donor_address}
      </p>
      {d.status === 'accepted' && <p className="mt-2 text-sm text-gray-700">Waiting for a volunteer to take it.</p>}
      {['assigned', 'picked_up'].includes(d.status) && (
        <>
          <p className="mt-2 text-sm text-gray-700">
            {d.volunteer_name}
            {d.volunteer_phone && ` (${d.volunteer_phone})`} {d.status === 'assigned' ? 'is collecting it.' : 'is on the way to you.'}
          </p>
          <QrCodePanel
            endpoint={`/donations/${d.donation_id}/delivery-code`}
            buttonLabel="Show delivery QR"
            hint="The volunteer scans this when they hand the food over to you."
          />
        </>
      )}
    </li>
  );
}

export default function NgoWorkspace() {
  const matches = usePolling(() => api.get('/matches').then((res) => res.data.matches));
  const incoming = usePolling(() => api.get('/donations/incoming').then((res) => res.data.donations));

  function refreshBoth() {
    matches.reload();
    incoming.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Donations offered to you</h2>
        {matches.error && <p className="mt-2 text-sm text-red-700">{matches.error}</p>}
        {(matches.data || []).length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No open offers right now. New ones appear here automatically.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {matches.data.map((m) => (
              <MatchCard key={m.match_id} match={m} onResponded={refreshBoth} />
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800">Accepted donations</h2>
        {(incoming.data || []).length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing accepted yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {incoming.data.map((d) => (
              <IncomingCard key={d.donation_id} donation={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
