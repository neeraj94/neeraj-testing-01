import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { customerLogin } from '../features/auth/authSlice';
import { useToast } from '../components/ToastProvider';
import { selectApplicationName } from '../features/settings/selectors';

type LocationState = {
  from?: string;
};

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error } = useAppSelector((state) => state.auth);
  const applicationName = useAppSelector(selectApplicationName);
  const { notify } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const state = (location.state as LocationState | null) ?? null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const result = await dispatch(customerLogin({ email, password }));
    if (customerLogin.fulfilled.match(result)) {
      notify({ type: 'success', message: 'Signed in successfully.' });
      navigate(state?.from ?? '/', { replace: true });
    } else if (customerLogin.rejected.match(result)) {
      const message = result.payload ?? 'Unable to sign in right now.';
      setFormError(message);
      notify({ type: 'error', message });
    }
  };

  const activeError = formError ?? (status === 'failed' ? error ?? null : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-slate-800">Welcome Back</h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to continue shopping with {applicationName || 'our store'}.
        </p>
        {activeError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {activeError}
          </div>
        )}
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
            <div className="mt-1 flex items-center rounded-md border border-slate-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-l-md border-none px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-r-md text-slate-500 transition hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.53 3.53 20.47 20.47M9.88 9.88a3 3 0 0 0 4.24 4.24M6.71 6.73A11.05 11.05 0 0 0 1.458 12C3.195 15.908 7.272 19 12 19c1.82 0 3.53-.43 5.049-1.194M9.88 9.88 6.71 6.73m7.41 7.39 3.13 3.15M21.542 12A11.05 11.05 0 0 0 17.29 7.27M14.12 14.12l3.17 3.17M9.88 9.88l4.24 4.24M14.12 9.88a3 3 0 0 0-4.24 4.24"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
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
          Need an admin account?{' '}
          <Link to="/admin/login" className="text-primary hover:underline">
            Sign in to the Admin portal
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          Don&apos;t have a customer account?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
