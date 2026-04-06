import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

/**
 * Formats a number with commas for the tooltip.
 */
function numFormatter(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Formats a rate to one decimal place.
 */
function rateFormatter(value) {
  return Number(value).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * CrimeChart — horizontal bar chart showing FBI crime categories.
 * Defaults to per-100k rates; a toggle reveals raw counts.
 *
 * @param {{ crime: object }} props — the crime section from combineCityData
 */
export default function CrimeChart({ crime }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!crime) return null;

  const hasRates = crime.violentCrimeRate != null || crime.propertyCrimeRate != null;

  const rateEntries = [
    { name: 'Violent Crime', value: crime.violentCrimeRate },
    { name: 'Property Crime', value: crime.propertyCrimeRate },
    { name: 'Homicide', value: crime.homicideRate },
    { name: 'Robbery', value: crime.robberyRate },
    { name: 'Agg. Assault', value: crime.aggravatedAssaultRate },
    { name: 'Burglary', value: crime.burglaryRate },
    { name: 'Larceny', value: crime.larcenyRate },
    { name: 'Vehicle Theft', value: crime.motorVehicleTheftRate },
  ].filter((d) => d.value != null);

  const rawEntries = [
    { name: 'Violent Crime', value: crime.violentCrime },
    { name: 'Property Crime', value: crime.propertyCrime },
    { name: 'Homicide', value: crime.homicide },
    { name: 'Robbery', value: crime.robbery },
    { name: 'Agg. Assault', value: crime.aggravatedAssault },
    { name: 'Burglary', value: crime.burglary },
    { name: 'Larceny', value: crime.larceny },
    { name: 'Vehicle Theft', value: crime.motorVehicleTheft },
  ].filter((d) => d.value != null);

  const useRates = hasRates && !showRaw;
  const entries = useRates ? rateEntries : rawEntries;
  const formatter = useRates ? rateFormatter : numFormatter;

  if (entries.length === 0) return null;

  return (
    <div>
      {useRates && (
        <p className="mb-1 text-[11px] text-gray-400">Incidents per 100,000 residents</p>
      )}
      <div role="img" aria-label={`Crime statistics bar chart showing ${entries.length} categories`}>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={entries.length * 40 + 40}>
            <BarChart
              data={entries}
              layout="vertical"
              margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={formatter} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={120}
              />
              <Tooltip formatter={(v) => formatter(v)} />
              <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <table className="sr-only">
        <caption>Crime data — {useRates ? 'per 100,000 residents' : 'raw counts'}</caption>
        <thead>
          <tr><th>Category</th><th>{useRates ? 'Rate per 100k' : 'Count'}</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.name}><td>{e.name}</td><td>{formatter(e.value)}</td></tr>
          ))}
        </tbody>
      </table>
      {hasRates && (
        <button
          type="button"
          onClick={() => setShowRaw((p) => !p)}
          className="mt-1 text-[11px] text-blue-500 hover:text-blue-700 hover:underline"
        >
          {showRaw ? '← Show per 100k rates' : 'Show raw counts →'}
        </button>
      )}
    </div>
  );
}
