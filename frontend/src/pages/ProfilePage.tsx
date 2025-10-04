import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/http';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { loadCurrentUser } from '../features/auth/authSlice';

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', password: '' });
  const [message, setMessage] = useState<string | null>(null);

  const updateProfile = useMutation(
    async () => {
      await api.put('/profile', form);
    },
    {
      onSuccess: () => {
        setMessage('Profile updated successfully');
        setForm((prev) => ({ ...prev, password: '' }));
        dispatch(loadCurrentUser());
      }
    }
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
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
          disabled={updateProfile.isLoading}
        >
          {updateProfile.isLoading ? 'Saving...' : 'Save changes'}
        </button>
        {message && <p className="mt-4 text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
};

export default ProfilePage;
