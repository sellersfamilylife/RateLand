import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

/**
 * Formats a dollar value for the tooltip.
 */
function dollarFormatter(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * RentChart — vertical bar chart showing HUD Fair Market Rent by bedroom count.
 *
 * @param {{ housing: object }} props — the housing section from combineCityData
 */
export default function RentChart({ housing }) {
  if (!housing) return null;

  const entries = [
    { name: 'Efficiency', value: housing.fmr_efficiency },
    { name: '1 BR', value: housing.fmr_1br },
    { name: '2 BR', value: housing.fmr_2br },
    { name: '3 BR', value: housing.fmr_3br },
    { name: '4 BR', value: housing.fmr_4br },
  ].filter((d) => d.value != null);

  if (entries.length === 0) return null;

  return (
    <div>
      <div role="img" aria-label="Fair Market Rent bar chart by bedroom count">
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={entries} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={(v) => dollarFormatter(v)} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <table className="sr-only">
        <caption>Fair Market Rent by bedroom count</caption>
        <thead>
          <tr><th>Bedroom Type</th><th>Monthly Rent</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.name}><td>{e.name}</td><td>{dollarFormatter(e.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
