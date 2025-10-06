import { Fragment, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchSettings, updateSettings } from '../features/settings/settingsSlice';
import {
  selectPrimaryColor,
  selectSettingsCategories,
  selectSettingsError,
  selectSettingsStatus
} from '../features/settings/selectors';
import type { SettingItem, SettingsCategory, SettingsSection, SettingUpdatePayload } from '../types/settings';
import { useToast } from '../components/ToastProvider';
import { normalizeHexColor } from '../utils/colors';
import { extractErrorMessage } from '../utils/errors';

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
  const [initialValues, setInitialValues] = useState<DraftMap>({});
  const [draftValues, setDraftValues] = useState<DraftMap>({});
  const [isSaving, setIsSaving] = useState(false);

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

  const activeCategory: SettingsCategory | undefined = useMemo(
    () => categories.find((category) => category.key === activeCategoryKey),
    [categories, activeCategoryKey]
  );

  useEffect(() => {
    if (!activeCategory) {
      setActiveSectionKey(null);
      return;
    }

    if (
      !activeSectionKey ||
      !activeCategory.sections.some((section) => section.key === activeSectionKey)
    ) {
      setActiveSectionKey(activeCategory.sections[0]?.key ?? null);
    }
  }, [activeCategory, activeSectionKey]);

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

  const handleSelectCategory = (category: SettingsCategory) => {
    setActiveCategoryKey(category.key);
    setActiveSectionKey(category.sections[0]?.key ?? null);
  };

  const handleSelectSection = (section: SettingsSection) => {
    setActiveSectionKey(section.key);
  };

  const handleValueChange = (setting: SettingItem, nextValue: SettingFormValue) => {
    if (!setting.editable || !canUpdateSettings) return;
    setDraftValues((prev) => ({ ...prev, [setting.code]: nextValue }));
  };

  const handleReset = () => {
    setDraftValues({ ...initialValues });
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

  const renderSection = (section: SettingsSection) => {
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

  const isLoading = status === 'loading' && categories.length === 0;
  const hasError = status === 'failed' && categories.length === 0;
  const saveDisabled = !canUpdateSettings || !dirtyCodes.length || isSaving;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="max-w-3xl text-sm text-slate-500">
          Manage global preferences, company details, integrations, and the appearance of the
          dashboard.
        </p>
        {!canUpdateSettings && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            You have read-only access to settings. Contact an administrator to request edit
            permissions.
          </div>
        )}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-72">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <nav className="space-y-1">
              {categories.map((category) => {
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
        <section className="flex-1">
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
            <div className="space-y-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{activeCategory.label}</h2>
                  {activeCategory.description && (
                    <p className="text-sm text-slate-500">{activeCategory.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!canUpdateSettings || !dirtyCodes.length || isSaving}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-slate-100"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveDisabled}
                    title={
                      !canUpdateSettings ? 'You do not have permission to update settings.' : undefined
                    }
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-6 lg:flex-row">
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
                <div className="flex-1">
                  {activeCategory.sections.map((section) => (
                    <Fragment key={section.key}>
                      {section.key === activeSectionKey && renderSection(section)}
                    </Fragment>
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

export default SettingsPage;
