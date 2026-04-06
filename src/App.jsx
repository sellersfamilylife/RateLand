import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';
import SavedSearchesPage from './pages/SavedSearchesPage';
import SharedResultPage from './pages/SharedResultPage';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * ProtectedRoute — redirects to login if the user is not authenticated.
 */
function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return session ? children : <Navigate to="/login" replace />;
}

/**
 * Navigation bar — visible on all authenticated pages.
 */
function NavBar() {
  const { session } = useAuth();
  const navigate = useNavigate();

  if (!session) return null;

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[Logout]', err);
    }
    navigate('/login');
  }

  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link to="/" className="text-lg font-bold text-blue-600">
          RateLand
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/search" className="hover:underline">
            Search
          </Link>
          <Link to="/saved" className="hover:underline">
            Saved
          </Link>
          <button
            onClick={handleLogout}
            className="rounded border px-3 py-1 hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to main content
        </a>
        <NavBar />
        <main id="main-content">
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shared/:id" element={<SharedResultPage />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <SavedSearchesPage />
              </ProtectedRoute>
            }
          />

          {/* Catch‑all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </main>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
