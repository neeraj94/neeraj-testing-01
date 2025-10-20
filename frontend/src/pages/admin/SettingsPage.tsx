import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchSettings, updateSettings } from '../../features/settings/settingsSlice';
import {
  selectPrimaryColor,
  selectSettingsCategories,
  selectSettingsError,
  selectSettingsStatus
} from '../../features/settings/selectors';
import type { SettingItem, SettingsCategory, SettingsSection, SettingUpdatePayload } from '../../types/settings';
import { useToast } from '../../components/ToastProvider';
import { normalizeHexColor } from '../../utils/colors';
import { extractErrorMessage } from '../../utils/errors';
import api from '../../services/http';
import EmailTemplatesPanel from '../../components/settings/EmailTemplatesPanel';
import PageHeader from '../../components/PageHeader';
import PageSection from '../../components/PageSection';

type SettingFormValue = string | boolean;

type DraftMap = Record<string, SettingFormValue>;

type SettingsStatus = ReturnType<typeof selectSettingsStatus>;

const parseInitialValue = (setting: SettingItem): SettingFormValue => {
  if (setting.valueType === 'BOOLEAN') {
    return setting.value === 'true';
  }
  return setting.value ?? '';
};

const serializeValue = (setting: SettingItem, value: SettingFormValue): string | null => {
  if (setting.valueType === 'BOOLEAN') {
    return (value as boolean) ? 'true' : 'false';
  }

  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (setting.valueType === 'NUMBER') {
    return stringValue.trim();
  }

  return stringValue;
};

const SettingsPage = () => {
  const dispatch = useAppDispatch();
  const { notify } = useToast();
  const categories = useAppSelector(selectSettingsCategories);
  const status: SettingsStatus = useAppSelector(selectSettingsStatus);
  const error = useAppSelector(selectSettingsError);
  const primaryColor = useAppSelector(selectPrimaryColor);
  const canUpdateSettings = useAppSelector((state) =>
    state.auth.permissions.includes('SETTINGS_UPDATE')
  );

  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);
  const [emailView, setEmailView] = useState<'configuration' | 'templates'>('configuration');
  const [emailNavExpanded, setEmailNavExpanded] = useState(true);
  const [initialValues, setInitialValues] = useState<DraftMap>({});
  const [draftValues, setDraftValues] = useState<DraftMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailTouched, setTestEmailTouched] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchSettings());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (!categories.length) {
      setActiveCategoryKey(null);
      setActiveSectionKey(null);
      setInitialValues({});
      setDraftValues({});
      return;
    }

    if (!activeCategoryKey || !categories.some((category) => category.key === activeCategoryKey)) {
      setActiveCategoryKey(categories[0].key);
    }
  }, [categories, activeCategoryKey]);

  useEffect(() => {
    if (activeCategoryKey === 'email') {
      setEmailNavExpanded(true);
    }
  }, [activeCategoryKey]);

  const activeCategory: SettingsCategory | undefined = useMemo(
    () => categories.find((category) => category.key === activeCategoryKey),
    [categories, activeCategoryKey]
  );

  const isEmailTemplatesView = useMemo(
    () => activeCategoryKey === 'email' && emailView === 'templates',
    [activeCategoryKey, emailView]
  );

  const shouldUseSectionNav = useMemo(() => {
    if (!activeCategory) {
      return false;
    }
    if (activeCategory.key === 'email' || isEmailTemplatesView) {
      return false;
    }
    return activeCategory.sections.length > 1;
  }, [activeCategory, isEmailTemplatesView]);

  useEffect(() => {
    if (!activeCategory) {
      if (activeSectionKey !== null) {
        setActiveSectionKey(null);
      }
      return;
    }

    if (!shouldUseSectionNav) {
      if (activeSectionKey !== null) {
        setActiveSectionKey(null);
      }
      return;
    }

    if (
      !activeSectionKey ||
      !activeCategory.sections.some((section) => section.key === activeSectionKey)
    ) {
      setActiveSectionKey(activeCategory.sections[0]?.key ?? null);
    }
  }, [activeCategory, activeSectionKey, shouldUseSectionNav]);

  useEffect(() => {
    if (!categories.length) {
      return;
    }
    const nextInitial: DraftMap = {};
    categories.forEach((category) => {
      category.sections.forEach((section) => {
        section.settings.forEach((setting) => {
          nextInitial[setting.code] = parseInitialValue(setting);
        });
      });
    });
    setInitialValues(nextInitial);
    setDraftValues({ ...nextInitial });
    setTestEmail('');
    setTestEmailTouched(false);
  }, [categories]);

  const settingIndex = useMemo(() => {
    const map = new Map<string, SettingItem>();
    categories.forEach((category) => {
      category.sections.forEach((section) => {
        section.settings.forEach((setting) => {
          map.set(setting.code, setting);
        });
      });
    });
    return map;
  }, [categories]);

  const getDraftValueForSetting = (setting: SettingItem): SettingFormValue => {
    if (Object.prototype.hasOwnProperty.call(draftValues, setting.code)) {
      return draftValues[setting.code];
    }
    if (Object.prototype.hasOwnProperty.call(initialValues, setting.code)) {
      return initialValues[setting.code];
    }
    return parseInitialValue(setting);
  };

  const getStringValueForSetting = (setting: SettingItem): string => {
    const value = getDraftValueForSetting(setting);
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  };

  useEffect(() => {
    if (activeCategoryKey !== 'email') {
      return;
    }
    const fromSetting = settingIndex.get('email.from_address');
    if (!fromSetting) {
      return;
    }
    const draft = draftValues['email.from_address'];
    const initial = initialValues['email.from_address'];
    const candidate =
      typeof draft === 'string' && draft.trim().length
        ? draft.trim()
        : typeof initial === 'string' && initial.trim().length
          ? initial.trim()
          : fromSetting.value && fromSetting.value.trim().length
            ? fromSetting.value.trim()
            : '';
    if (!testEmailTouched && candidate && candidate !== testEmail) {
      setTestEmail(candidate);
    }
  }, [
    activeCategoryKey,
    settingIndex,
    draftValues,
    initialValues,
    testEmailTouched,
    testEmail
  ]);

  const dirtyCodes = useMemo(() => {
    const codes: string[] = [];
    for (const [code, value] of Object.entries(draftValues)) {
      const setting = settingIndex.get(code);
      if (!setting) continue;
      const initial = initialValues[code];
      if (serializeValue(setting, value) !== serializeValue(setting, initial)) {
        codes.push(code);
      }
    }
    return codes;
  }, [draftValues, initialValues, settingIndex]);

  const handleSelectCategory = (
    category: SettingsCategory,
    view: 'configuration' | 'templates' = 'configuration'
  ) => {
    setActiveCategoryKey(category.key);
    if (category.key === 'email') {
      setEmailNavExpanded(true);
      setEmailView(view);
    } else {
      setEmailView('configuration');
    }
    const useNav = category.key !== 'email' && category.sections.length > 1;
    setActiveSectionKey(useNav ? category.sections[0]?.key ?? null : null);
  };

  const handleSelectSection = (section: SettingsSection) => {
    if (!shouldUseSectionNav) {
      return;
    }
    setActiveSectionKey(section.key);
  };

  const handleSelectEmailTemplates = () => {
    setActiveCategoryKey('email');
    setEmailNavExpanded(true);
    setEmailView('templates');
    setActiveSectionKey(null);
  };

  const handleValueChange = (setting: SettingItem, nextValue: SettingFormValue) => {
    if (!setting.editable || !canUpdateSettings) return;
    setDraftValues((prev) => ({ ...prev, [setting.code]: nextValue }));
  };

  const handleReset = () => {
    setDraftValues({ ...initialValues });
    setTestEmail('');
    setTestEmailTouched(false);
  };

  const handleSave = async () => {
    if (!canUpdateSettings || !dirtyCodes.length) {
      return;
    }
    setIsSaving(true);
    const updates: SettingUpdatePayload[] = dirtyCodes
      .map((code) => {
        const setting = settingIndex.get(code);
        if (!setting) return null;
        return {
          code,
          value: serializeValue(setting, draftValues[code])
        };
      })
      .filter((update): update is SettingUpdatePayload => update !== null);

    try {
      await dispatch(updateSettings(updates)).unwrap();
      notify({ type: 'success', message: 'Settings updated successfully.' });
    } catch (error) {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Failed to update settings.')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!canUpdateSettings || isSendingTest) {
      return;
    }
    const recipient = testEmail.trim();
    setTestEmail(recipient);
    if (!recipient.length) {
      notify({ type: 'error', message: 'Enter an email address to send a test message.' });
      return;
    }
    if (!emailRegex.test(recipient)) {
      notify({ type: 'error', message: 'Enter a valid email address before sending a test message.' });
      return;
    }
    if (dirtyCodes.length) {
      notify({ type: 'error', message: 'Save your email settings before sending a test email.' });
      return;
    }

    setIsSendingTest(true);
    try {
      await api.post('/settings/email/test', { recipient });
      notify({ type: 'success', message: 'Test email sent successfully.' });
    } catch (error) {
      notify({
        type: 'error',
        message: extractErrorMessage(error, 'Unable to send test email.')
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const renderFieldControl = (setting: SettingItem) => {
    const currentValue = draftValues[setting.code];
    const disabled = !setting.editable || isSaving || !canUpdateSettings;

    if (setting.valueType === 'BOOLEAN') {
      const checked = Boolean(currentValue);
      return (
        <button
          type="button"
          onClick={() => handleValueChange(setting, !checked)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
            checked ? 'border-primary bg-primary/90' : 'border-slate-300 bg-slate-200'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-inner'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              checked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      );
    }

    if (setting.valueType === 'NUMBER') {
      return (
        <input
          type="number"
          value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
          onChange={(event) => handleValueChange(setting, event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      );
    }

    if (setting.options.length) {
      return (
        <select
          value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
          onChange={(event) => handleValueChange(setting, event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {setting.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (setting.valueType === 'TEXT') {
      return (
        <textarea
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(event) => handleValueChange(setting, event.target.value)}
          disabled={disabled}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      );
    }

    if (setting.valueType === 'COLOR') {
      const normalized = normalizeHexColor(
        typeof currentValue === 'string' && currentValue ? currentValue : primaryColor
      );
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={normalized}
            onChange={(event) => handleValueChange(setting, event.target.value)}
            disabled={disabled}
            className="h-10 w-14 cursor-pointer rounded-md border border-slate-300 bg-transparent"
          />
          <span className="text-xs font-medium text-slate-500">{normalized}</span>
        </div>
      );
    }

    return (
      <input
        type="text"
        value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
        onChange={(event) => handleValueChange(setting, event.target.value)}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
      />
    );
  };

  const renderGenericSection = (section: SettingsSection) => {
    return (
      <div className="space-y-4">
        {section.settings.map((setting) => (
          <div
            key={setting.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{setting.label}</h3>
                {setting.description && (
                  <p className="mt-1 text-sm text-slate-500">{setting.description}</p>
                )}
                {!setting.editable && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Read-only
                  </span>
                )}
              </div>
              <div className="w-full md:w-72">{renderFieldControl(setting)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOptionButtons = (setting?: SettingItem) => {
    if (!setting || !setting.options.length) {
      return null;
    }
    const currentValue = getStringValueForSetting(setting);
    const disabled = !setting.editable || isSaving || !canUpdateSettings;
    return (
      <div className="flex flex-wrap gap-2">
        {setting.options.map((option) => {
          const isActive = currentValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleValueChange(setting, option.value)}
              disabled={disabled}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-300 text-slate-600 hover:border-primary/50 hover:text-primary'
              } ${disabled ? 'cursor-not-allowed opacity-60 hover:border-slate-300 hover:text-slate-600' : ''}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderInputField = (
    setting?: SettingItem,
    type: 'text' | 'number' | 'password' = 'text'
  ) => {
    if (!setting) {
      return null;
    }
    const value = getStringValueForSetting(setting);
    const disabled = !setting.editable || isSaving || !canUpdateSettings;
    const inputType = type === 'number' ? 'number' : type === 'password' ? 'password' : 'text';
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-900">{setting.label}</label>
        {setting.description && <p className="text-sm text-slate-500">{setting.description}</p>}
        <input
          type={inputType}
          value={value}
          onChange={(event) => handleValueChange(setting, event.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>
    );
  };

  const renderTextareaField = (
    setting?: SettingItem,
    rows = 4,
    extraClass = ''
  ) => {
    if (!setting) {
      return null;
    }
    const value = getStringValueForSetting(setting);
    const disabled = !setting.editable || isSaving || !canUpdateSettings;
    return (
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-900">{setting.label}</label>
        {setting.description && <p className="text-sm text-slate-500">{setting.description}</p>}
        <textarea
          value={value}
          onChange={(event) => handleValueChange(setting, event.target.value)}
          disabled={disabled}
          rows={rows}
          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${extraClass}`}
        />
      </div>
    );
  };

  const renderEmailSection = (section: SettingsSection) => {
    const map = new Map(section.settings.map((setting) => [setting.code, setting]));
    const resolveSetting = (code: string) => map.get(code) ?? settingIndex.get(code);

    if (section.key === 'email-smtp') {
      const driverSetting = resolveSetting('email.driver');
      const encryptionSetting = resolveSetting('email.smtp_encryption');
      const hostSetting = resolveSetting('email.smtp_host');
      const portSetting = resolveSetting('email.smtp_port');
      const usernameSetting = resolveSetting('email.smtp_username');
      const passwordSetting = resolveSetting('email.smtp_password');
      const fromNameSetting = resolveSetting('email.from_name');
      const fromAddressSetting = resolveSetting('email.from_address');
      const replyToSetting = resolveSetting('email.reply_to');
      const bccSetting = resolveSetting('email.bcc_all');

      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{section.label}</h3>
              {section.description && (
                <p className="text-sm text-slate-500">{section.description}</p>
              )}
            </div>
            <div className="space-y-6">
              {driverSetting && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">{driverSetting.label}</label>
                  {driverSetting.description && (
                    <p className="text-sm text-slate-500">{driverSetting.description}</p>
                  )}
                  {renderOptionButtons(driverSetting)}
                  {!driverSetting.editable && (
                    <p className="text-xs text-slate-500">Only SMTP transport is available for this deployment.</p>
                  )}
                </div>
              )}
              {encryptionSetting && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-900">{encryptionSetting.label}</label>
                  {encryptionSetting.description && (
                    <p className="text-sm text-slate-500">{encryptionSetting.description}</p>
                  )}
                  {renderOptionButtons(encryptionSetting)}
                </div>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                {renderInputField(hostSetting)}
                {renderInputField(portSetting, 'number')}
                {renderInputField(usernameSetting)}
                {renderInputField(passwordSetting, 'password')}
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {renderInputField(fromNameSetting)}
                {renderInputField(fromAddressSetting)}
                {renderInputField(replyToSetting)}
                {renderInputField(bccSetting)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (section.key === 'email-templates') {
      const signatureSetting = resolveSetting('email.signature');
      const headerSetting = resolveSetting('email.header_html');
      const footerSetting = resolveSetting('email.footer_html');

      return (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{section.label}</h3>
              {section.description && (
                <p className="text-sm text-slate-500">{section.description}</p>
              )}
            </div>
            <div className="space-y-6">
              {renderTextareaField(signatureSetting, 4)}
              {renderTextareaField(headerSetting, 8, 'font-mono')}
              {renderTextareaField(footerSetting, 8, 'font-mono')}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-slate-900">Send Test Email</h3>
              <p className="text-sm text-slate-500">
                Use the saved SMTP configuration to send yourself a quick test message.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:flex-1">
                <label className="text-sm font-semibold text-slate-900" htmlFor="email-test-recipient">
                  Recipient email
                </label>
                <input
                  id="email-test-recipient"
                  type="email"
                  value={testEmail}
                  onChange={(event) => {
                    setTestEmailTouched(true);
                    setTestEmail(event.target.value);
                  }}
                  disabled={!canUpdateSettings || isSendingTest}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={!canUpdateSettings || isSendingTest}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingTest ? 'Sending…' : 'Send Test Email'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Save changes above before sending a test message.
            </p>
          </div>
        </div>
      );
    }

    return renderGenericSection(section);
  };

  const renderSectionContent = (section: SettingsSection) => {
    if (section.key.startsWith('email-')) {
      return renderEmailSection(section);
    }
    return renderGenericSection(section);
  };

  const isLoading = status === 'loading' && categories.length === 0;
  const hasError = status === 'failed' && categories.length === 0;
  const saveDisabled = !canUpdateSettings || !dirtyCodes.length || isSaving;

  return (
    <div className="space-y-6 px-6 py-6">
      <PageHeader
        title="Settings"
        description="Manage company preferences, integrations, email delivery, and lifecycle automation templates."
      />
      {!canUpdateSettings && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You have read-only access to settings. Contact an administrator to request edit permissions.
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-72">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <nav className="space-y-1">
              {categories.map((category) => {
                if (category.key === 'email') {
                  const isParentActive = activeCategoryKey === 'email';
                  const isConfigurationActive = isParentActive && emailView === 'configuration';
                  const isTemplatesActive = isParentActive && emailView === 'templates';
                  return (
                    <div key={category.key} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setEmailNavExpanded((previous) => !previous)}
                        className={`w-full rounded-xl px-4 py-3 text-left transition ${
                          isParentActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{category.label}</p>
                            {category.description && (
                              <p className="mt-1 text-xs text-slate-500">{category.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">{emailNavExpanded ? '▾' : '▸'}</span>
                        </div>
                      </button>
                      {emailNavExpanded && (
                        <div className="ml-4 space-y-1">
                          <button
                            type="button"
                            onClick={() => handleSelectCategory(category, 'configuration')}
                            className={`w-full rounded-lg px-4 py-2 text-left text-sm transition ${
                              isConfigurationActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            Email delivery & wrappers
                          </button>
                          <button
                            type="button"
                            onClick={handleSelectEmailTemplates}
                            className={`w-full rounded-lg px-4 py-2 text-left text-sm transition ${
                              isTemplatesActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            Automation templates
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                const isActive = category.key === activeCategoryKey;
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className={`w-full rounded-xl px-4 py-3 text-left transition ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <p className="text-sm font-semibold">{category.label}</p>
                    {category.description && (
                      <p className="mt-1 text-xs text-slate-500">{category.description}</p>
                    )}
                  </button>
                );
              })}
              {!categories.length && (
                <p className="px-3 py-4 text-sm text-slate-500">No settings available yet.</p>
              )}
            </nav>
          </div>
        </aside>
        <section className="flex-1 space-y-6">
          {isLoading && (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <span className="text-sm text-slate-500">Loading settings…</span>
            </div>
          )}
          {hasError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p className="font-semibold">Unable to load settings</p>
              <p className="mt-2">{error}</p>
              <button
                type="button"
                onClick={() => dispatch(fetchSettings())}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-rose-700"
              >
                Try again
              </button>
            </div>
          )}
          {!isLoading && !hasError && activeCategory && (
            <>
              {isEmailTemplatesView ? (
                <PageSection
                  title="Email templates"
                  description="Enable and customise lifecycle emails such as user welcome messages and staff verification requests."
                >
                  <EmailTemplatesPanel />
                </PageSection>
              ) : (
                <PageSection
                  title={activeCategory.label}
                  description={activeCategory.description ?? undefined}
                  bodyClassName={shouldUseSectionNav ? 'flex flex-col gap-6 lg:flex-row' : undefined}
                  footer={
                    <>
                      <button
                        type="button"
                        onClick={handleReset}
                        disabled={!canUpdateSettings || !dirtyCodes.length || isSaving}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saveDisabled}
                        title={!canUpdateSettings ? 'You do not have permission to update settings.' : undefined}
                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? 'Saving…' : 'Save changes'}
                      </button>
                    </>
                  }
                >
                  {shouldUseSectionNav && (
                    <div className="w-full lg:w-64">
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <nav className="space-y-1">
                          {activeCategory.sections.map((section) => {
                            const isActive = section.key === activeSectionKey;
                            return (
                              <button
                                key={section.key}
                                type="button"
                                onClick={() => handleSelectSection(section)}
                                className={`w-full rounded-xl px-4 py-3 text-left transition ${
                                  isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <p className="text-sm font-semibold">{section.label}</p>
                                {section.description && (
                                  <p className="mt-1 text-xs text-slate-500">{section.description}</p>
                                )}
                              </button>
                            );
                          })}
                        </nav>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 space-y-6">
                    {shouldUseSectionNav
                      ? activeCategory.sections.map((section) => (
                          <Fragment key={section.key}>
                            {section.key === activeSectionKey && renderSectionContent(section)}
                          </Fragment>
                        ))
                      : activeCategory.sections.map((section) => (
                          <Fragment key={section.key}>{renderSectionContent(section)}</Fragment>
                        ))}
                  </div>
                </PageSection>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
