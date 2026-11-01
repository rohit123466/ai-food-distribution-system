import { label } from '../utils/format';

const COLORS = {
  posted: 'bg-blue-50 text-blue-700',
  accepted: 'bg-indigo-50 text-indigo-700',
  assigned: 'bg-amber-50 text-amber-700',
  picked_up: 'bg-orange-50 text-orange-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  fresh: 'bg-emerald-50 text-emerald-700',
  spoiled: 'bg-red-50 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ value, prefix }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[value] || COLORS.pending}`}>
      {prefix ? `${prefix}: ` : ''}
      {label(value)}
    </span>
  );
}
