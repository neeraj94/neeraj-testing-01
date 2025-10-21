import { Link, useLocation } from 'react-router-dom';

interface VerifyLocationState {
  email?: string;
}

const VerifyAccountPage = () => {
  const location = useLocation();
  const state = (location.state as VerifyLocationState | null) ?? null;
  const email = state?.email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-2xl">📬</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-slate-800">Check your inbox</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your account has been created successfully. Please verify your email before logging in.
        </p>
        {email && (
          <p className="mt-2 text-sm text-slate-500">
            We sent a verification link to <span className="font-medium text-slate-700">{email}</span>.
          </p>
        )}
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p>If you do not see the email, check your spam folder or request a new verification link.</p>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-600"
          >
            Back to sign in
          </Link>
          <Link
            to="/"
            className="rounded-md border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyAccountPage;
