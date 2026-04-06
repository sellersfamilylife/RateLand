import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4'];

/**
 * EducationDonut — donut chart showing education attainment from Census data.
 *
 * @param {{ census: object }} props — the census section from combineCityData
 */
export default function EducationDonut({ census }) {
  if (!census) return null;

  const entries = [
    { name: "Bachelor's", value: Number(census.educationBachelors) || 0 },
    { name: "Master's", value: Number(census.educationMasters) || 0 },
    { name: 'Doctorate', value: Number(census.educationDoctorate) || 0 },
  ];

  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div role="img" aria-label="Education attainment donut chart">
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={entries}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {entries.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => new Intl.NumberFormat('en-US').format(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <table className="sr-only">
        <caption>Education attainment</caption>
        <thead>
          <tr><th>Degree</th><th>Holders</th><th>Percentage</th></tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.name}>
              <td>{e.name}</td>
              <td>{new Intl.NumberFormat('en-US').format(e.value)}</td>
              <td>{total > 0 ? ((e.value / total) * 100).toFixed(1) : 0}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
