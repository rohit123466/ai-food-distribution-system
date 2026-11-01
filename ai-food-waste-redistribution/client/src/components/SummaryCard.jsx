export default function SummaryCard({ title, rows }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
