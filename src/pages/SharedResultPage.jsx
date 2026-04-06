import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ResultsDisplay from '../components/ResultsDisplay';

export default function SharedResultPage() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from('shared_results')
        .select('city, state, data')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError('Shared link not found.');
      } else {
        setResult(data);
      }
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        Loading shared results…
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="mb-4 text-gray-600">{error || 'Link not found.'}</p>
        <Link
          to="/search"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Search your own city
        </Link>
      </div>
    );
  }

  const actions = (
    <Link
      to="/search"
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Search your own city
    </Link>
  );

  return (
    <ResultsDisplay
      city={result.city}
      stateName={result.state}
      data={result.data}
      actions={actions}
    />
  );
}
