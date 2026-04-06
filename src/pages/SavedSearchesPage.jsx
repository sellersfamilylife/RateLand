import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

export default function SavedSearchesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterText, setFilterText] = useState('');
  const [committedFilter, setCommittedFilter] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce filter text → committed filter (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setCommittedFilter(filterText);
      setPage(0);
      setLoading(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [filterText]);

  // Fetch searches when page, committed filter, or refreshKey changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let query = supabase
        .from('city_searches')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (committedFilter.trim()) {
        const safe = committedFilter.trim().replace(/[.,()]/g, '');
        if (safe) {
          query = query.or(`city.ilike.%${safe}%,state.ilike.%${safe}%`);
        }
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setSearches(data ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [page, committedFilter, user.id, refreshKey]);

  function handleFilterChange(e) {
    setFilterText(e.target.value);
  }

  function viewResult(search) {
    navigate('/results', {
      state: {
        city: search.city,
        stateName: search.state,
        data: search.raw_api_response,
      },
    });
  }

  async function handleDelete(search) {
    const ok = window.confirm(
      `Delete saved search for ${search.city}, ${search.state}?`
    );
    if (!ok) return;

    setDeleting(search.id);
    const { error: deleteError } = await supabase
      .from('city_searches')
      .delete()
      .eq('id', search.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setRefreshKey((k) => k + 1);
    }
    setDeleting(null);
  }

  if (loading && searches.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const showingFrom = totalCount === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Saved Searches</h1>

      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}

      <label htmlFor="saved-filter" className="sr-only">Filter by city or state</label>
      <input
        id="saved-filter"
        type="text"
        value={filterText}
        onChange={handleFilterChange}
        placeholder="Filter by city or state…"
        className="mb-4 w-full rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {searches.length === 0 ? (
        <p className="text-gray-500">
          {filterText.trim() ? (
            'No saved searches match your filter.'
          ) : (
            <>
              No saved searches yet.{' '}
              <button
                onClick={() => navigate('/search')}
                className="text-blue-600 hover:underline"
              >
                Search a city
              </button>
            </>
          )}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {searches.map((s) => (
              <li key={s.id}>
                <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm hover:shadow">
                  <button
                    onClick={() => viewResult(s)}
                    className="text-left"
                  >
                    <span className="text-lg font-semibold">
                      {s.city}, {s.state}
                    </span>
                    <span className="ml-3 text-sm text-gray-400">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={deleting === s.id}
                    className="ml-4 rounded px-2 py-1 text-sm text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Delete search for ${s.city}, ${s.state}`}
                  >
                    {deleting === s.id ? '…' : '✕ Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
              <span>
                Showing {showingFrom}–{showingTo} of {totalCount}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(0, p - 1));
                  }}
                  disabled={page === 0}
                  aria-label="Previous page"
                  className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(totalPages - 1, p + 1));
                  }}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                  className="rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
