import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { signup } from '../features/auth/authSlice';
import { selectApplicationName } from '../features/settings/selectors';

const SignupPage = () => {
  const dispatch = useAppDispatch();
  const applicationName = useAppSelector(selectApplicationName);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await dispatch(signup(form));
    if (signup.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-slate-800">Create Account</h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign up to explore {applicationName || 'the dashboard'}.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600">First name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Last name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={8}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Passwords must contain at least 8 characters.</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Sign up
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/admin/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
