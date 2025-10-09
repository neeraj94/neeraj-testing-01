import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/http';
import { useToast } from '../ToastProvider';
import { extractErrorMessage } from '../../utils/errors';
import RichTextEditor from '../RichTextEditor';
import type {
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateListResponse,
  EmailTemplateUpdatePayload
} from '../../types/emailTemplates';
import { useAppSelector } from '../../app/hooks';

const EMAIL_TEMPLATES_QUERY_KEY = ['email-templates'];

const fetchTemplates = async (): Promise<EmailTemplateListResponse> => {
  const { data } = await api.get<EmailTemplateListResponse>('/settings/email/templates');
  return data;
};

const fetchTemplateDetail = async (id: number): Promise<EmailTemplateDetail> => {
  const { data } = await api.get<EmailTemplateDetail>(`/settings/email/templates/${id}`);
  return data;
};

interface TemplateGroup {
  category: string;
  templates: EmailTemplateListItem[];
}

const EmailTemplatesPanel = () => {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const canUpdate = useAppSelector((state) => state.auth.permissions.includes('SETTINGS_UPDATE'));

  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<EmailTemplateListResponse>({ queryKey: EMAIL_TEMPLATES_QUERY_KEY, queryFn: fetchTemplates });

  const templates: EmailTemplateListItem[] = data?.templates ?? [];

  const groupedTemplates: TemplateGroup[] = useMemo(() => {
    const groups: TemplateGroup[] = [];
    templates.forEach((template) => {
      const existing = groups.find((group) => group.category === template.category);
      if (existing) {
        existing.templates.push(template);
      } else {
        groups.push({ category: template.category, templates: [template] });
      }
    });
    return groups;
  }, [templates]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedCategories((previous) => {
      const next: Record<string, boolean> = {};
      groupedTemplates.forEach((group) => {
        next[group.category] = previous[group.category] ?? true;
      });
      return next;
    });
  }, [groupedTemplates]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (!templates.length) {
      setSelectedTemplateId(null);
      return;
    }
    if (!selectedTemplateId || !templates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const detailQuery = useQuery({
    queryKey: ['email-template', selectedTemplateId],
    queryFn: () => fetchTemplateDetail(selectedTemplateId as number),
    enabled: selectedTemplateId !== null
  });

  const detail = detailQuery.data;

  const [form, setForm] = useState<EmailTemplateUpdatePayload>({
    enabled: false,
    subject: '',
    bodyHtml: ''
  });

  useEffect(() => {
    if (!detail) {
      return;
    }
    setForm({
      enabled: detail.enabled,
      subject: detail.subject,
      bodyHtml: detail.bodyHtml
    });
  }, [detail?.id, detail?.enabled, detail?.subject, detail?.bodyHtml]);

  const dirty = useMemo(() => {
    if (!detail) {
      return false;
    }
    return (
      form.enabled !== detail.enabled ||
      form.subject !== detail.subject ||
      form.bodyHtml !== detail.bodyHtml
    );
  }, [detail, form]);

  const mutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: EmailTemplateUpdatePayload }) => {
      const { data: updated } = await api.put<EmailTemplateDetail>(`/settings/email/templates/${id}`, payload);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: EMAIL_TEMPLATES_QUERY_KEY });
      queryClient.setQueryData(['email-template', updated.id], updated);
      if (updated.id === detail?.id) {
        setForm({
          enabled: updated.enabled,
          subject: updated.subject,
          bodyHtml: updated.bodyHtml
        });
      }
      notify({ type: 'success', message: 'Email template updated successfully.' });
    },
    onError: (err: unknown) => {
      notify({
        type: 'error',
        message: extractErrorMessage(err, 'Unable to update email template.')
      });
    }
  });

  const handleToggleCategory = (category: string) => {
    setExpandedCategories((previous) => ({
      ...previous,
      [category]: !previous[category]
    }));
  };

  const handleSelectTemplate = (template: EmailTemplateListItem) => {
    setSelectedTemplateId(template.id);
  };

  const handleToggleEnabled = async (template: EmailTemplateListItem, enabled: boolean) => {
    if (!canUpdate) {
      return;
    }
    try {
      const existingDetail = await queryClient.fetchQuery({
        queryKey: ['email-template', template.id],
        queryFn: () => fetchTemplateDetail(template.id)
      });
      await mutation.mutateAsync({
        id: template.id,
        payload: {
          enabled,
          subject: existingDetail.subject,
          bodyHtml: existingDetail.bodyHtml
        }
      });
    } catch (err) {
      notify({
        type: 'error',
        message: extractErrorMessage(err, 'Unable to update email template.')
      });
    }
  };

  const handleSave = () => {
    if (!detail || !canUpdate || mutation.isPending) {
      return;
    }
    mutation.mutate({ id: detail.id, payload: form });
  };

  const handleReset = () => {
    if (!detail) {
      return;
    }
    setForm({
      enabled: detail.enabled,
      subject: detail.subject,
      bodyHtml: detail.bodyHtml
    });
  };

  const listDisabled = mutation.isPending;
  const formDisabled = mutation.isPending || !canUpdate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-80">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Automation templates</h3>
            <p className="mt-1 text-xs text-slate-500">
              Manage transactional emails triggered by user lifecycle events.
            </p>
            <div className="mt-4 space-y-3">
              {isLoading && <p className="text-sm text-slate-500">Loading templates…</p>}
              {isError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <p className="font-semibold">Unable to load templates</p>
                  <p className="mt-1 text-xs text-rose-600">{extractErrorMessage(error, 'Please try again later.')}</p>
                </div>
              )}
              {!isLoading && !isError && !groupedTemplates.length && (
                <p className="text-sm text-slate-500">No email templates are available yet.</p>
              )}
              {!isLoading && !isError &&
                groupedTemplates.map((group) => {
                  const isExpanded = expandedCategories[group.category] ?? true;
                  return (
                    <div key={group.category} className="rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(group.category)}
                        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-semibold text-slate-800">{group.category}</span>
                        <span className="text-xs text-slate-500">{isExpanded ? 'Hide' : 'Show'}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-slate-200 bg-slate-50">
                          {group.templates.map((template) => {
                            const isActive = template.id === selectedTemplateId;
                            return (
                              <div
                                key={template.id}
                                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${
                                  isActive
                                    ? 'bg-white font-semibold text-primary shadow-inner'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleSelectTemplate(template)}
                                  className="flex-1 text-left"
                                >
                                  <p>{template.name}</p>
                                  {template.description && (
                                    <p className="text-xs font-normal text-slate-500">{template.description}</p>
                                  )}
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    {template.enabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleEnabled(template, !template.enabled)}
                                    disabled={!canUpdate || listDisabled}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full border transition-colors ${
                                      template.enabled
                                        ? 'border-primary bg-primary/80'
                                        : 'border-slate-300 bg-slate-200'
                                    } ${
                                      !canUpdate || listDisabled
                                        ? 'cursor-not-allowed opacity-60'
                                        : 'hover:shadow-inner'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                        template.enabled ? 'translate-x-5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </aside>
        <section className="flex-1">
          {detailQuery.isLoading && (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <span className="text-sm text-slate-500">Loading template…</span>
            </div>
          )}
          {detailQuery.isError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p className="font-semibold">Unable to load template</p>
              <p className="mt-2 text-xs text-rose-600">
                {extractErrorMessage(detailQuery.error, 'Select another template or try again later.')}
              </p>
            </div>
          )}
          {!detailQuery.isLoading && !detailQuery.isError && detail && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{detail.name}</h2>
                    {detail.description && (
                      <p className="text-sm text-slate-500">{detail.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>{form.enabled ? 'Enabled' : 'Disabled'}</span>
                    <button
                      type="button"
                      onClick={() => setForm((previous) => ({ ...previous, enabled: !previous.enabled }))}
                      disabled={!canUpdate || mutation.isPending}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                        form.enabled ? 'border-primary bg-primary/80' : 'border-slate-300 bg-slate-200'
                      } ${
                        !canUpdate || mutation.isPending
                          ? 'cursor-not-allowed opacity-60'
                          : 'hover:shadow-inner'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          form.enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900" htmlFor="email-template-subject">
                      Subject line
                    </label>
                    <input
                      id="email-template-subject"
                      type="text"
                      value={form.subject}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, subject: event.target.value }))
                      }
                      disabled={formDisabled}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Email body</label>
                    <RichTextEditor
                      value={form.bodyHtml}
                      onChange={(value) => setForm((previous) => ({ ...previous, bodyHtml: value }))}
                      minHeight={320}
                      disabled={formDisabled}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={formDisabled || !dirty}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-100"
                  >
                    Reset changes
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={formDisabled || !dirty}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutation.isPending ? 'Saving…' : 'Save template'}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Available merge fields</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Insert these tokens into the subject or body to personalize the email. They will be replaced when the message is
                  sent.
                </p>
                <div className="mt-4 space-y-3">
                  {detail.availableMergeFields.length === 0 && (
                    <p className="text-sm text-slate-500">This template does not define custom merge fields.</p>
                  )}
                  {detail.availableMergeFields.map((field) => (
                    <div key={field.token} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{field.token}</p>
                      <p className="text-xs text-slate-500">{field.label}</p>
                      {field.description && (
                        <p className="mt-1 text-xs text-slate-400">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EmailTemplatesPanel;
