/**
 * DataSourceBadge — shows the status of a single data source.
 *
 * @param {{ label: string, status: "live"|"coming-soon"|"placeholder"|"error"|"no-key" }} props
 */
export default function DataSourceBadge({ label, status }) {
  const styles = {
    live: 'bg-green-100 text-green-800',
    'coming-soon': 'bg-blue-100 text-blue-800',
    placeholder: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    'no-key': 'bg-gray-100 text-gray-600',
  };

  const dots = {
    live: 'bg-green-500',
    'coming-soon': 'bg-blue-500',
    placeholder: 'bg-amber-500',
    error: 'bg-red-500',
    'no-key': 'bg-gray-400',
  };

  const statusLabel = {
    live: 'Live',
    'coming-soon': 'Coming Soon',
    placeholder: 'Coming Soon',
    error: 'Error',
    'no-key': 'Key Needed',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dots[status]}`} />
      {label} — {statusLabel[status]}
    </span>
  );
}
