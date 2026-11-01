import { useState } from 'react';
import api from '../../services/api';
import usePolling from '../../hooks/usePolling';
import DonationForm from './DonationForm.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import AiVerdict from '../../components/AiVerdict.jsx';
import QrCodePanel from '../../components/QrCodePanel.jsx';
import { apiError, imageUrl, isUrgent, label, timeLeft } from '../../utils/format';

const ACTIVE_STATUSES = ['posted', 'accepted', 'assigned', 'picked_up'];

function nextStepText(d) {
  if (d.status === 'posted' && d.freshness_status === 'fresh') {
    return Number(d.open_match_count) > 0
      ? `Waiting for ${d.open_match_count} NGO(s) to respond.`
      : 'No NGO in range has taken it yet.';
  }
  if (d.status === 'accepted') return `Accepted by ${d.ngo_name}. Waiting for a volunteer.`;
  if (d.status === 'assigned') return `${d.volunteer_name} is coming to collect it. Show them the pickup code.`;
  if (d.status === 'picked_up') return `${d.volunteer_name} is taking it to ${d.ngo_name}.`;
  if (d.status === 'delivered') return `Delivered to ${d.ngo_name}.`;
  return null;
}

function canRetry(d) {
  return (
    d.status === 'posted' &&
    timeLeft(d.expiry_estimate) !== 'expired' &&
    (d.freshness_status === 'pending' || (d.freshness_status === 'fresh' && Number(d.open_match_count) === 0))
  );
}

function DonationCard({ donation: d, onChanged }) {
  const [message, setMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  async function retry() {
    setIsRetrying(true);
    setMessage('');
    try {
      const { data } = await api.post(`/donations/${d.donation_id}/retry`);
      setMessage(data.matchedNgoCount > 0 ? `Offered to ${data.matchedNgoCount} NGO(s).` : 'Checked again: nothing new yet.');
      onChanged();
    } catch (err) {
      setMessage(apiError(err, 'Retry failed.'));
    } finally {
      setIsRetrying(false);
    }
  }

  const active = ACTIVE_STATUSES.includes(d.status);

  return (
    <li className="flex gap-4 rounded-lg border bg-white p-4">
      {d.image_url && (
        <img src={imageUrl(d.image_url)} alt={d.food_type} className="h-20 w-20 flex-none rounded-md object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-800">
            #{d.donation_id} · {d.food_type}
          </span>
          <StatusBadge value={d.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {d.quantity_kg} kg · {label(d.food_category)} · {label(d.diet_type)} · {label(d.storage_condition)}
          {active && (
            <span className={`ml-2 ${isUrgent(d.expiry_estimate) ? 'font-medium text-red-700' : ''}`}>
              {timeLeft(d.expiry_estimate)}
            </span>
          )}
        </p>
        <div className="mt-1">
          <AiVerdict freshness={d.freshness_status} aiLabels={d.ai_labels} />
        </div>
        {nextStepText(d) && <p className="mt-2 text-sm text-gray-700">{nextStepText(d)}</p>}
        {d.status === 'assigned' && (
          <QrCodePanel
            endpoint={`/donations/${d.donation_id}/pickup-code`}
            buttonLabel="Show pickup QR"
            hint="The volunteer scans this when they collect the food."
          />
        )}
        {canRetry(d) && (
          <button
            onClick={retry}
            disabled={isRetrying}
            className="mt-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {isRetrying ? 'Retrying...' : d.freshness_status === 'pending' ? 'Retry AI check' : 'Look for NGOs again'}
          </button>
        )}
        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>
    </li>
  );
}

export default function DonorWorkspace() {
  const { data, error, reload } = usePolling(() => api.get('/donations/mine').then((res) => res.data));
  const donations = data?.donations || [];
  const impact = data?.impact;

  return (
    <div className="space-y-6">
      {impact && Number(impact.deliveries) > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-lg border bg-white p-4 text-center shadow-sm">
          <div>
            <p className="text-2xl font-semibold text-emerald-700">{impact.deliveries}</p>
            <p className="text-xs text-gray-500">deliveries</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-emerald-700">{Math.round(impact.meals)}</p>
            <p className="text-xs text-gray-500">meals served</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-emerald-700">{Math.round(impact.co2_saved_kg)} kg</p>
            <p className="text-xs text-gray-500">CO2e avoided</p>
          </div>
        </div>
      )}

      <DonationForm onPosted={reload} />

      <div>
        <h2 className="text-lg font-semibold text-gray-800">Your donations</h2>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        {donations.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No donations yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {donations.map((d) => (
              <DonationCard key={d.donation_id} donation={d} onChanged={reload} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
