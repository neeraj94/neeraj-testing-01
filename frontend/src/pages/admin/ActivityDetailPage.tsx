import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/http';
import type { ActivityLogDetail } from '../../types/models';
import { extractErrorMessage } from '../../utils/errors';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

const renderContextValue = (value: unknown) => {
  if (Array.isArray(value)) {
    if (!value.length) {
      return <span className="text-sm text-slate-500">—</span>;
    }
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        {value.map((item, index) => (
          <li key={index}>{renderContextValue(item)}</li>
        ))}
      </ul>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-500">—</span>;
  }

  return <span className="text-sm text-slate-700">{String(value)}</span>;
};

const renderStatusBadge = (status?: string | null) => {
  if (!status) {
    return <span className="text-slate-400">—</span>;
  }
  const normalized = status.toUpperCase();
  const isSuccess = normalized === 'SUCCESS';
  const isFailure = normalized === 'FAILURE' || normalized === 'ERROR';
  const badgeClass = isSuccess
    ? 'bg-emerald-100 text-emerald-700'
    : isFailure
    ? 'bg-rose-100 text-rose-700'
    : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>{normalized}</span>;
};

const ActivityDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const detailQuery = useQuery<ActivityLogDetail>({
    queryKey: ['activity', 'detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await api.get<ActivityLogDetail>(`/activity/${id}`);
      return data;
    }
  });

  const handleBack = () => {
    navigate('/activity');
  };

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading activity details…
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          ← Back to Activity
        </button>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          {extractErrorMessage(detailQuery.error, 'Unable to load the selected activity. It may have been removed.')}
        </div>
      </div>
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      >
        ← Back to Activity
      </button>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Activity details</h1>
          <p className="text-sm text-slate-500">
            Review the complete metadata captured for this action.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Timestamp</div>
            <div className="mt-1 text-sm font-medium text-slate-800">{formatDateTime(detail.occurredAt)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Status</div>
            <div className="mt-1">{renderStatusBadge(detail.status)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">User</div>
            <div className="mt-1 text-sm font-medium text-slate-800">{detail.userName}</div>
            <div className="text-xs text-slate-500">{detail.userId ? `User ID: ${detail.userId}` : 'User ID not captured'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Role &amp; Department</div>
            <div className="mt-1 text-sm text-slate-700">{detail.userRole ?? '—'}</div>
            <div className="text-xs text-slate-500">{detail.department ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Module</div>
            <div className="mt-1 text-sm text-slate-700">{detail.module ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Activity type</div>
            <div className="mt-1 text-sm text-slate-700">{detail.activityType}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">IP address</div>
            <div className="mt-1 text-sm text-slate-700">{detail.ipAddress ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">Device</div>
            <div className="mt-1 text-sm text-slate-700">{detail.device ?? '—'}</div>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Description</div>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {detail.description ?? 'No additional description provided.'}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Context</div>
          <div className="mt-2 space-y-3">
            {detail.context && Object.keys(detail.context).length > 0 ? (
              Object.entries(detail.context).map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</div>
                  <div className="mt-1">{renderContextValue(value)}</div>
                </div>
              ))
            ) : detail.rawContext ? (
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {detail.rawContext}
              </pre>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No contextual metadata recorded for this activity.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailPage;
