/**
 * SectionMeta — subtle annotation bar showing data source, vintage, and geographic scope.
 *
 * @param {{ source: string, vintage: string, scope: "city"|"county"|"state", note?: string }} props
 */
const scopeStyles = {
  city: 'bg-green-100 text-green-700',
  county: 'bg-blue-100 text-blue-700',
  state: 'bg-amber-100 text-amber-700',
};

const scopeLabels = {
  city: 'City-level',
  county: 'County-level',
  state: 'State-level',
};

export default function SectionMeta({ source, vintage, scope, note }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
      <span>Source: {source}</span>
      <span className="hidden sm:inline">·</span>
      <span>Vintage: {vintage}</span>
      <span className="hidden sm:inline">·</span>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${scopeStyles[scope] ?? 'bg-gray-100 text-gray-600'}`}
      >
        {scopeLabels[scope] ?? scope}
      </span>
      {note && (
        <span className="basis-full text-[11px] text-amber-500">{note}</span>
      )}
    </div>
  );
}
