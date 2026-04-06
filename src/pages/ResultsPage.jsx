import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ResultsDisplay from '../components/ResultsDisplay';
import { exportJSON, exportCSV, exportPDF, shareResults } from '../lib/export';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const contentRef = useRef(null);

  const { city, stateName, data } = location.state ?? {};
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!data) navigate('/search', { replace: true });
  }, [data, navigate]);

  if (!data) return null;

  async function handleSave() {
    setSaving(true);
    setError('');
    const { error: insertError } = await supabase
      .from('city_searches')
      .insert({
        user_id: user.id,
        city,
        state: stateName,
        raw_api_response: data,
      });
    if (insertError) {
      setError(insertError.message);
    } else {
      setSaved(true);
    }
    setSaving(false);
  }

  async function handlePDF() {
    if (!contentRef.current) return;
    setGeneratingPDF(true);
    try {
      await exportPDF(contentRef.current, city, stateName);
    } catch (err) {
      setError('PDF generation failed.');
      console.error('[PDF]', err);
    }
    setGeneratingPDF(false);
  }

  async function handleShare() {
    setSharing(true);
    setError('');
    try {
      const url = await shareResults(city, stateName, data, user.id);
      await navigator.clipboard.writeText(url);
      setShared(true);
    } catch (err) {
      setError(err.message);
    }
    setSharing(false);
  }

  const actions = (
    <>
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Search'}
      </button>
      <button
        onClick={() => exportJSON(data, city, stateName)}
        aria-label="Export as JSON"
        className="rounded border px-3 py-2 text-sm hover:bg-gray-100"
      >
        JSON
      </button>
      <button
        onClick={() => exportCSV(data, city, stateName)}
        aria-label="Export as CSV"
        className="rounded border px-3 py-2 text-sm hover:bg-gray-100"
      >
        CSV
      </button>
      <button
        onClick={handlePDF}
        disabled={generatingPDF}
        aria-label="Export as PDF"
        className="rounded border px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
      >
        {generatingPDF ? 'Generating…' : 'PDF'}
      </button>
      <button
        onClick={handleShare}
        disabled={sharing || shared}
        aria-label="Copy shareable link"
        className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {shared ? 'Link Copied ✓' : sharing ? 'Sharing…' : 'Copy Link'}
      </button>
      <button
        onClick={() => navigate('/search')}
        className="rounded border px-4 py-2 text-sm hover:bg-gray-100"
      >
        New Search
      </button>
    </>
  );

  return (
    <ResultsDisplay
      ref={contentRef}
      city={city}
      stateName={stateName}
      data={data}
      actions={actions}
      errorMessage={error}
    />
  );
}
