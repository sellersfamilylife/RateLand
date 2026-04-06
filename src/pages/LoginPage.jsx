import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Login page — supports email/password sign‑in, sign‑up, and magic‑link login.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'magic'
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    // --- Password strength check on signup ---
    if (mode === 'signup') {
      if (password.length < 8)
        return setError('Password must be at least 8 characters.');
      if (!/[A-Z]/.test(password))
        return setError('Password must include at least one uppercase letter.');
      if (!/[a-z]/.test(password))
        return setError('Password must include at least one lowercase letter.');
      if (!/[0-9]/.test(password))
        return setError('Password must include at least one number.');
    }

    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error: err } = await supabase.auth.signInWithOtp({ email });
        if (err) throw err;
        setMessage('Check your email for the magic link.');
      } else if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMessage('Account created! Check your email to confirm.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        // Auth state change will redirect via AuthContext
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-center text-2xl font-bold">
          {mode === 'signup'
            ? 'Create Account'
            : mode === 'magic'
            ? 'Magic Link Login'
            : 'Sign In'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="sr-only">Email</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {mode !== 'magic' && (
            <div>
              <label htmlFor="login-password" className="sr-only">Password</label>
              <input
                id="login-password"
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-gray-400">
                  Min 8 characters, with uppercase, lowercase, and a number.
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'Please wait…'
              : mode === 'signup'
              ? 'Sign Up'
              : mode === 'magic'
              ? 'Send Magic Link'
              : 'Sign In'}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}
        {message && (
          <p className="mt-4 text-center text-sm text-green-600">{message}</p>
        )}

        <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500">
          {mode !== 'login' && (
            <button onClick={() => setMode('login')} className="hover:underline">
              Sign in with password
            </button>
          )}
          {mode !== 'signup' && (
            <button onClick={() => setMode('signup')} className="hover:underline">
              Create an account
            </button>
          )}
          {mode !== 'magic' && (
            <button onClick={() => setMode('magic')} className="hover:underline">
              Use magic link instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
