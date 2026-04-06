/**
 * InfoTooltip — small ℹ️ icon that reveals explanatory text on hover/focus.
 * Uses Tailwind group-hover + focus-within for desktop & mobile accessibility.
 *
 * @param {{ text: string }} props
 */
export default function InfoTooltip({ text }) {
  return (
    <span className="group relative inline-block align-middle">
      <button
        type="button"
        aria-label="More info"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] leading-none text-gray-500 hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-gray-100 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
      >
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
