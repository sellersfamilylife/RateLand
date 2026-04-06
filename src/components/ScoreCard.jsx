import InfoTooltip from './InfoTooltip';

/**
 * ScoreCard — displays a single big metric with a label.
 * Pure Tailwind, no chart library needed.
 *
 * @param {{ label: string, value: number|string|null, prefix?: string, format?: "number"|"currency"|"plain", tooltip?: string }} props
 */
export default function ScoreCard({ label, value, prefix = '', format = 'number', tooltip }) {
  let display = '—';

  if (value != null && value !== '') {
    if (format === 'currency') {
      display = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(Number(value));
    } else if (format === 'number') {
      display = `${prefix}${new Intl.NumberFormat('en-US').format(Number(value))}`;
    } else {
      display = `${prefix}${value}`;
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-bold text-gray-900">{display}</p>
      <p className="mt-1 text-sm text-gray-500">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </p>
    </div>
  );
}
