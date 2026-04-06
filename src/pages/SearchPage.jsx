import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { combineCityData } from '../lib/api/combine';

/**
 * US states list for the dropdown selector.
 */
const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado',
  'Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho',
  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana',
  'Maine','Maryland','Massachusetts','Michigan','Minnesota',
  'Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York',
  'North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
  'Pennsylvania','Rhode Island','South Carolina','South Dakota',
  'Tennessee','Texas','Utah','Vermont','Virginia','Washington',
  'West Virginia','Wisconsin','Wyoming',
];

const CITY_NAME_PATTERN = /^[\p{L}\s.\-']+$/u;
const SEARCH_COOLDOWN_MS = 3000;

/**
 * Validate a city name. Returns an error string or null.
 */
function validateCity(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return 'Please enter a city name.';
  if (name.length < 2) return 'City name must be at least 2 characters.';
  if (name.length > 100) return 'City name must be under 100 characters.';
  if (!CITY_NAME_PATTERN.test(name))
    return "City name can only contain letters (including accented), spaces, hyphens, periods, and apostrophes.";
  return null;
}

/**
 * Search page — enter a city + state and fetch aggregated data.
 */
export default function SearchPage() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const lastSearchTime = useRef(0);
  const abortRef = useRef(null);

  // Abort any in-flight request when the component unmounts (navigation away)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Cancel search on Escape key
  useEffect(() => {
    if (!loading) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') cancelSearch();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading]);

  function cancelSearch() {
    abortRef.current?.abort();
    setLoading(false);
  }

  async function handleSearch(e) {
    e.preventDefault();

    // --- Input validation ---
    const cityError = validateCity(city);
    if (cityError) { setError(cityError); return; }
    if (!state || !US_STATES.includes(state)) { setError('Please select a valid state.'); return; }

    // --- Rate limiting ---
    const now = Date.now();
    if (now - lastSearchTime.current < SEARCH_COOLDOWN_MS) {
      setError('Please wait a few seconds between searches.');
      return;
    }

    const sanitizedCity = city.trim().replace(/\s+/g, ' ');

    setError('');
    setLoading(true);
    lastSearchTime.current = now;

    // Abort any previous request and create a fresh controller
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await combineCityData(sanitizedCity, state, { signal: controller.signal });

      // City existence check — geocode returned no results
      if (data.error) { setError(data.error); return; }

      navigate('/results', { state: { city: sanitizedCity, stateName: state, data } });
    } catch (err) {
      if (err.name === 'AbortError') return; // User navigated away — ignore
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const DATA_SOURCES = [
    'U.S. Census Bureau',
    'FBI Crime Data',
    'HUD Fair Market Rent',
    'MIT Living Wage',
    'County Health Rankings',
    'CDC WONDER',
    'Geocoding (OSM)',
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Search a City</h1>

      <form onSubmit={handleSearch} className="space-y-4">
        <div>
          <label htmlFor="city" className="mb-1 block text-sm font-medium">
            City
          </label>
          <input
            id="city"
            type="text"
            required
            placeholder="e.g. Austin"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="state" className="mb-1 block text-sm font-medium">
            State
          </label>
          <select
            id="state"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a state</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Fetching data…' : 'Search'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
      )}

      {/* ── Loading overlay ──────────────────────────────── */}
      {loading && (
        <div role="dialog" aria-modal="true" aria-label="Searching for city data" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white px-6 py-8 shadow-xl">
            <div className="flex flex-col items-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
              <p className="mb-1 text-lg font-semibold text-gray-800">
                Gathering data for
              </p>
              <p className="mb-5 text-blue-600 font-medium">
                {city.trim()}, {state}
              </p>
              <ul className="w-full space-y-2">
                {DATA_SOURCES.map((src) => (
                  <li key={src} className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    {src}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-gray-400">
                This usually takes a few seconds
              </p>
              <button
                type="button"
                onClick={cancelSearch}
                className="mt-4 rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
