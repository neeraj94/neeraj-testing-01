import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { login } from '../features/auth/authSlice';
import { useToast } from '../components/ToastProvider';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { status, error } = useAppSelector((state) => state.auth);
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'failed' && error) {
      setErrorMessage(error);
      setShowErrorDialog(true);
    }
  }, [status, error]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowErrorDialog(false);
    setErrorMessage(null);
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      notify({ type: 'success', message: 'Signed in successfully.' });
      navigate('/dashboard');
    } else if (login.rejected.match(result)) {
      const message = result.payload ?? 'Unable to sign in right now.';
      setErrorMessage(message);
      setShowErrorDialog(true);
      notify({ type: 'error', message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-slate-800">Welcome Back</h2>
        <p className="mt-2 text-sm text-slate-500">Sign in with your RBAC Dashboard account.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
      {showErrorDialog && errorMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-800">We couldn&apos;t sign you in</h3>
                <p className="mt-1 text-sm text-slate-500">{errorMessage}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowErrorDialog(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
