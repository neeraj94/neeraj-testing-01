import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/http';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { loadCurrentUser } from '../features/auth/authSlice';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const { notify } = useToast();

  const updateProfile = useMutation({
    mutationFn: async () => {
      await api.put('/profile', form);
    },
    onSuccess: () => {
      setForm((prev) => ({ ...prev, password: '' }));
      setError(null);
      dispatch(loadCurrentUser());
      notify({ type: 'success', message: 'Profile updated successfully.' });
    },
    onError: (err) => {
      const message = extractErrorMessage(err, 'Unable to update profile.');
      setError(message);
      notify({ type: 'error', message });
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim()) {
      const message = 'Full name is required.';
      setError(message);
      notify({ type: 'error', message });
      return;
    }
    if (form.password && form.password.length > 0 && form.password.length < 8) {
      const message = 'Password must be at least 8 characters long.';
      setError(message);
      notify({ type: 'error', message });
      return;
    }
    setError(null);
    updateProfile.mutate();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Profile</h1>
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Full name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Leave blank to keep current password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? 'Saving...' : 'Save changes'}
        </button>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
};

export default ProfilePage;
