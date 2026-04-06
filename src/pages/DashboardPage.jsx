import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard — landing page after login.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Welcome to RateLand</h1>
      <p className="mb-8 text-gray-600">
        Signed in as <span className="font-medium">{user?.email}</span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/search"
          className="flex flex-col items-center rounded-lg border bg-white p-6 shadow hover:shadow-md"
        >
          <span className="mb-2 text-4xl">🔍</span>
          <span className="text-lg font-semibold">Search a City</span>
          <span className="mt-1 text-sm text-gray-500">
            Get aggregated data for any U.S. city
          </span>
        </Link>

        <Link
          to="/saved"
          className="flex flex-col items-center rounded-lg border bg-white p-6 shadow hover:shadow-md"
        >
          <span className="mb-2 text-4xl">📂</span>
          <span className="text-lg font-semibold">Saved Searches</span>
          <span className="mt-1 text-sm text-gray-500">
            Review your previously saved results
          </span>
        </Link>
      </div>
    </div>
  );
}
