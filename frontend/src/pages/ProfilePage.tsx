import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/http';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { loadCurrentUser } from '../features/auth/authSlice';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';
import MediaLibraryDialog from '../components/MediaLibraryDialog';
import type { MediaSelection } from '../types/uploaded-file';

interface UploadedFileUploadResponse {
  url: string;
  storageKey?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
    whatsappNumber: user?.whatsappNumber ?? '',
    facebookUrl: user?.facebookUrl ?? '',
    linkedinUrl: user?.linkedinUrl ?? '',
    skypeId: user?.skypeId ?? '',
    emailSignature: user?.emailSignature ?? '',
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<MediaSelection | null>(
    user?.profileImageUrl ? { url: user.profileImageUrl } : null
  );
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      whatsappNumber: user?.whatsappNumber ?? '',
      facebookUrl: user?.facebookUrl ?? '',
      linkedinUrl: user?.linkedinUrl ?? '',
      skypeId: user?.skypeId ?? '',
      emailSignature: user?.emailSignature ?? ''
    }));
  }, [
    user?.firstName,
    user?.lastName,
    user?.email,
    user?.phoneNumber,
    user?.whatsappNumber,
    user?.facebookUrl,
    user?.linkedinUrl,
    user?.skypeId,
    user?.emailSignature
  ]);

  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfileImage({ url: user.profileImageUrl });
    } else {
      setProfileImage(null);
    }
  }, [user?.profileImageUrl]);

  const profileInitials = useMemo(() => {
    if (user?.fullName?.trim()) {
      const parts = user.fullName
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase());
      return (parts[0] ?? 'U') + (parts[1] ?? '');
    }
    if (user?.firstName?.trim()) {
      return user.firstName.trim().charAt(0).toUpperCase();
    }
    return 'U';
  }, [user?.fullName, user?.firstName]);

  const openMediaDialog = () => {
    setMediaDialogOpen(true);
  };

  const closeMediaDialog = () => {
    setMediaDialogOpen(false);
  };

  const handleProfileImageSelect = (selection: MediaSelection) => {
    setProfileImage(selection);
    closeMediaDialog();
  };

  const handleProfileImageUpload = async (files: File[]): Promise<MediaSelection[]> => {
    const sanitized = files.filter(Boolean);
    if (!sanitized.length) {
      return [];
    }
    const formData = new FormData();
    sanitized.forEach((file) => formData.append('files', file));
    formData.append('module', 'USER_PROFILE');

    try {
      const { data } = await api.post<UploadedFileUploadResponse[]>('/uploaded-files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const selections = (data ?? [])
        .filter((item): item is UploadedFileUploadResponse => Boolean(item && item.url))
        .map((uploaded) => ({
          url: uploaded.url,
          storageKey: uploaded.storageKey ?? undefined,
          originalFilename: uploaded.originalFilename ?? undefined,
          mimeType: uploaded.mimeType ?? undefined,
          sizeBytes: uploaded.sizeBytes ?? undefined
        }));
      if (!selections.length) {
        throw new Error('Upload failed');
      }
      notify({
        type: 'success',
        message:
          selections.length === 1
            ? `Uploaded ${selections[0].originalFilename ?? 'file'} successfully.`
            : `Uploaded ${selections.length} files successfully.`
      });
      return selections;
    } catch (uploadError) {
      notify({
        type: 'error',
        message: extractErrorMessage(uploadError, 'Unable to upload profile image. Please try again.')
      });
      throw uploadError;
    }
  };

  const handleProfileImageUploadComplete = (selections: MediaSelection[]) => {
    if (selections.length) {
      setProfileImage(selections[0]);
    }
    closeMediaDialog();
  };

  const handleRemoveProfileImage = () => {
    setProfileImage(null);
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      const oldPassword = form.oldPassword.trim();
      const newPassword = form.newPassword.trim();
      const confirmPassword = form.confirmNewPassword.trim();
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim() || undefined,
        facebookUrl: form.facebookUrl.trim() || undefined,
        linkedinUrl: form.linkedinUrl.trim() || undefined,
        skypeId: form.skypeId.trim() || undefined,
        emailSignature: form.emailSignature.trim() || undefined,
        profileImageUrl: profileImage?.url ?? null,
        oldPassword: oldPassword ? oldPassword : undefined,
        newPassword: newPassword ? newPassword : undefined,
        confirmNewPassword: confirmPassword ? confirmPassword : undefined
      };
      await api.put('/profile', payload);
    },
    onSuccess: () => {
      setForm((prev) => ({
        ...prev,
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }));
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
    const trimmedFirst = form.firstName.trim();
    const trimmedLast = form.lastName.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedFirst) {
      const message = 'First name is required.';
      setError(message);
      notify({ type: 'error', message });
      return;
    }
    if (!trimmedLast) {
      const message = 'Last name is required.';
      setError(message);
      notify({ type: 'error', message });
      return;
    }
    if (!trimmedEmail) {
      const message = 'Email is required.';
      setError(message);
      notify({ type: 'error', message });
      return;
    }

    const wantsPasswordChange = Boolean(
      form.oldPassword.trim() || form.newPassword.trim() || form.confirmNewPassword.trim()
    );
    if (wantsPasswordChange) {
      if (!form.oldPassword.trim()) {
        const message = 'Current password is required to change your password.';
        setError(message);
        notify({ type: 'error', message });
        return;
      }
      if (form.newPassword.trim().length < 8) {
        const message = 'New password must be at least 8 characters long.';
        setError(message);
        notify({ type: 'error', message });
        return;
      }
      if (form.newPassword !== form.confirmNewPassword) {
        const message = 'New password confirmation does not match.';
        setError(message);
        notify({ type: 'error', message });
        return;
      }
    }

    setError(null);
    updateProfile.mutate();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal details, contact preferences, and account security in one place.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Personal information</h2>
          <p className="mt-1 text-sm text-slate-500">This information is used across the workspace to identify you.</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="aspect-square w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {profileImage?.url ? (
                <img
                  src={profileImage.url}
                  alt="Profile avatar"
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-500">
                  {profileInitials}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openMediaDialog}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                >
                  {profileImage ? 'Change photo' : 'Add photo'}
                </button>
                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemoveProfileImage}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">Use a square image to keep your avatar crisp across the app.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600">First name</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Last name</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Phone number</label>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">WhatsApp number</label>
              <input
                type="tel"
                value={form.whatsappNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Skype</label>
              <input
                type="text"
                value={form.skypeId}
                onChange={(e) => setForm((prev) => ({ ...prev, skypeId: e.target.value }))}
                placeholder="Optional"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">LinkedIn</label>
              <input
                type="url"
                value={form.linkedinUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/in/username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Facebook</label>
              <input
                type="url"
                value={form.facebookUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
                placeholder="https://facebook.com/username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-600">Email signature</label>
            <textarea
              value={form.emailSignature}
              onChange={(e) => setForm((prev) => ({ ...prev, emailSignature: e.target.value }))}
              placeholder="Include closing, contact info, or compliance messages"
              rows={4}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Change password</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your current password to set a new one. Passwords must be at least 8 characters long.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600">Current password</label>
              <input
                type="password"
                value={form.oldPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                placeholder="••••••••"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">New password</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                placeholder="At least 8 characters"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Confirm new password</label>
              <input
                type="password"
                value={form.confirmNewPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                placeholder="Re-enter new password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
            onClick={() => {
              setForm({
                firstName: user?.firstName ?? '',
                lastName: user?.lastName ?? '',
                email: user?.email ?? '',
                phoneNumber: user?.phoneNumber ?? '',
                whatsappNumber: user?.whatsappNumber ?? '',
                facebookUrl: user?.facebookUrl ?? '',
                linkedinUrl: user?.linkedinUrl ?? '',
                skypeId: user?.skypeId ?? '',
                emailSignature: user?.emailSignature ?? '',
                oldPassword: '',
                newPassword: '',
                confirmNewPassword: ''
              });
              setProfileImage(user?.profileImageUrl ? { url: user.profileImageUrl } : null);
              setError(null);
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
      <MediaLibraryDialog
        open={mediaDialogOpen}
        onClose={closeMediaDialog}
        onSelect={handleProfileImageSelect}
        onUpload={handleProfileImageUpload}
        onUploadComplete={handleProfileImageUploadComplete}
        moduleFilters={['USER_PROFILE']}
        title="Select profile image"
      />
    </div>
  );
};

export default ProfilePage;
