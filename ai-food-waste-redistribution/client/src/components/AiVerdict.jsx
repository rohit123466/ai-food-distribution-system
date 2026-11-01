import StatusBadge from './StatusBadge.jsx';

// The stored AI result (donation_images.ai_labels) in one line: verdict, the
// score against the threshold it was judged by, and which model produced it,
// so nobody mistakes the heuristic for a trained classifier.
export default function AiVerdict({ freshness, aiLabels }) {
  const result = typeof aiLabels === 'string' ? JSON.parse(aiLabels) : aiLabels;

  return (
    <div className="text-xs text-gray-600">
      <StatusBadge value={freshness} prefix="AI freshness" />
      {result && (
        <span className="ml-2">
          {result.freshness_score}/100 (min {result.threshold}) · {result.model}
        </span>
      )}
      {freshness === 'pending' && <span className="ml-2">AI service hasn&apos;t checked this photo yet</span>}
      {result?.warnings?.map((w) => (
        <p key={w} className="mt-1 text-amber-700">
          {w}
        </p>
      ))}
    </div>
  );
}
