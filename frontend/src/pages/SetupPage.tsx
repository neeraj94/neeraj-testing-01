import { Fragment, type DragEvent, useEffect, useMemo, useState } from 'react';
import api from '../services/http';
import { DEFAULT_NAVIGATION_MENU } from '../constants/navigation';
import type {
  MenuLayoutConfigNode,
  MenuLayoutUpdatePayload,
  NavigationNode,
  SetupLayoutResponse
} from '../types/navigation';
import { useToast } from '../components/ToastProvider';
import { extractErrorMessage } from '../utils/errors';

interface DragInfo {
  level: 'root' | 'child';
  parentKey: string | null;
  index: number;
}

const cloneNodes = (nodes: NavigationNode[]): NavigationNode[] =>
  nodes.map((node) => ({
    ...node,
    children: node.children?.length ? cloneNodes(node.children) : []
  }));

const serializeLayout = (nodes: NavigationNode[]): MenuLayoutConfigNode[] =>
  nodes.map((node) => {
    const children = node.children?.length ? serializeLayout(node.children) : undefined;
    return children && children.length ? { key: node.key, children } : { key: node.key };
  });

const SetupPage = () => {
  const [layout, setLayout] = useState<NavigationNode[]>(DEFAULT_NAVIGATION_MENU);
  const [defaults, setDefaults] = useState<NavigationNode[]>(DEFAULT_NAVIGATION_MENU);
  const [savedLayout, setSavedLayout] = useState<NavigationNode[]>(DEFAULT_NAVIGATION_MENU);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragInfo | null>(null);
  const { notify } = useToast();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const { data } = await api.get<SetupLayoutResponse>('/setup/menu');
        if (!active) {
          return;
        }
        const fetchedLayout = data?.layout?.length ? data.layout : data?.defaults ?? DEFAULT_NAVIGATION_MENU;
        const fetchedDefaults = data?.defaults?.length ? data.defaults : DEFAULT_NAVIGATION_MENU;
        setLayout(cloneNodes(fetchedLayout));
        setSavedLayout(cloneNodes(fetchedLayout));
        setDefaults(cloneNodes(fetchedDefaults));
        setUpdatedAt(data.updatedAt ?? null);
        setUpdatedBy(data.updatedBy ?? null);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(extractErrorMessage(err, 'Unable to load setup information. Displaying defaults.'));
        setLayout(cloneNodes(DEFAULT_NAVIGATION_MENU));
        setSavedLayout(cloneNodes(DEFAULT_NAVIGATION_MENU));
        setDefaults(cloneNodes(DEFAULT_NAVIGATION_MENU));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const serializedLayout = useMemo(() => JSON.stringify(serializeLayout(layout)), [layout]);
  const savedSerialized = useMemo(() => JSON.stringify(serializeLayout(savedLayout)), [savedLayout]);
  const isDirty = serializedLayout !== savedSerialized;

  const moveNode = (source: DragInfo, targetIndex: number, parentKey: string | null) => {
    setLayout((prev) => {
      const cloned = cloneNodes(prev);
      if (source.level === 'root') {
        if (!cloned.length) {
          return cloned;
        }
        const boundedTarget = Math.min(Math.max(targetIndex, 0), cloned.length);
        const [item] = cloned.splice(source.index, 1);
        let insertionIndex = boundedTarget;
        if (source.index < boundedTarget) {
          insertionIndex -= 1;
        }
        cloned.splice(Math.max(insertionIndex, 0), 0, item);
        return cloned;
      }

      const parentIndex = cloned.findIndex((node) => node.key === (parentKey ?? source.parentKey));
      if (parentIndex === -1) {
        return prev;
      }
      const children = cloned[parentIndex].children ? [...cloned[parentIndex].children] : [];
      const boundedTarget = Math.min(Math.max(targetIndex, 0), children.length);
      const [item] = children.splice(source.index, 1);
      let insertionIndex = boundedTarget;
      if (source.index < boundedTarget) {
        insertionIndex -= 1;
      }
      children.splice(Math.max(insertionIndex, 0), 0, item);
      cloned[parentIndex] = { ...cloned[parentIndex], children };
      return cloned;
    });
  };

  const handleDrop = (targetLevel: DragInfo['level'], parentKey: string | null, targetIndex: number) =>
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setActiveDropZone(null);
      setDragging(null);

      let payload = dragInfo;
      if (!payload) {
        try {
          const data = event.dataTransfer.getData('application/x-setup-node');
          if (data) {
            payload = JSON.parse(data) as DragInfo;
          }
        } catch (err) {
          payload = null;
        }
      }

      if (!payload) {
        return;
      }

      if (payload.level !== targetLevel) {
        return;
      }

      const normalizedSourceParent = payload.parentKey ?? null;
      const normalizedTargetParent = parentKey ?? null;
      if (normalizedSourceParent !== normalizedTargetParent) {
        return;
      }

      moveNode(payload, targetIndex, normalizedTargetParent);
    };

  const handleDragStart = (info: DragInfo) => (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-setup-node', JSON.stringify(info));
    setDragInfo(info);
    setDragging(info);
  };

  const handleDragEnd = () => {
    setDragInfo(null);
    setActiveDropZone(null);
    setDragging(null);
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const payload: MenuLayoutUpdatePayload = { layout: serializeLayout(layout) };
      const { data } = await api.put<SetupLayoutResponse>('/setup/menu', payload);
      const refreshedLayout = data?.layout?.length ? data.layout : layout;
      const refreshedDefaults = data?.defaults?.length ? data.defaults : defaults;
      setLayout(cloneNodes(refreshedLayout));
      setSavedLayout(cloneNodes(refreshedLayout));
      setDefaults(cloneNodes(refreshedDefaults));
      setUpdatedAt(data.updatedAt ?? null);
      setUpdatedBy(data.updatedBy ?? null);
      notify({ type: 'success', message: 'Menu layout saved successfully.' });
    } catch (err) {
      notify({ type: 'error', message: extractErrorMessage(err, 'Unable to save layout. Please try again.') });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLayout(cloneNodes(defaults));
  };

  const handleUndo = () => {
    setLayout(cloneNodes(savedLayout));
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) {
      return null;
    }
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      return value;
    }
  };

  const renderDropZone = (
    level: DragInfo['level'],
    parentKey: string | null,
    index: number
  ) => {
    const dropId = `${level}-${parentKey ?? 'root'}-${index}`;
    const isActive = activeDropZone === dropId;
    return (
      <div
        key={`drop-${dropId}`}
        className={`my-1 w-full rounded border border-dashed transition-all ${
          isActive ? 'h-12 border-primary bg-primary/10' : 'h-3 border-transparent bg-transparent'
        }`}
        onDragOver={(event) => {
          if (!dragInfo) {
            return;
          }
          if (
            dragInfo.level !== level ||
            (dragInfo.parentKey ?? null) !== (parentKey ?? null)
          ) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setActiveDropZone(dropId);
        }}
        onDragEnter={() => {
          if (dragInfo && dragInfo.level === level && (dragInfo.parentKey ?? null) === (parentKey ?? null)) {
            setActiveDropZone(dropId);
          }
        }}
        onDragLeave={() => {
          if (activeDropZone === dropId) {
            setActiveDropZone(null);
          }
        }}
        onDrop={handleDrop(level, parentKey, index)}
      />
    );
  };

  const renderNodes = (
    nodes: NavigationNode[],
    level: DragInfo['level'],
    parentKey: string | null
  ) => (
    <ul className="space-y-2">
      {nodes.map((node, index) => (
        <li key={node.key} className="space-y-2">
          {renderDropZone(level, parentKey, index)}
          <div
            draggable
            onDragStart={handleDragStart({ level, parentKey, index })}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md ${
              dragging && dragging.level === level && dragging.parentKey === parentKey && dragging.index === index
                ? 'cursor-grabbing border-primary/60 shadow-lg'
                : 'cursor-grab border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-base">
                {node.icon ?? node.label.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{node.label}</p>
                {node.permissions.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Requires permissions: {node.permissions.join(', ')}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-400">Drag to reorder</span>
          </div>
          {node.children?.length ? (
            <div className="ml-6 border-l border-dashed border-slate-300 pl-6">
              {renderNodes(node.children, 'child', node.key)}
            </div>
          ) : null}
        </li>
      ))}
      {renderDropZone(level, parentKey, nodes.length)}
    </ul>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Loading setup options…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-800">Setup</h1>
        <p className="text-sm text-slate-500">
          Reorder top-level menus and their children. Your changes only update your personal navigation order and stay in sync with new features automatically.
        </p>
        {error && <p className="text-sm text-amber-600">{error}</p>}
        {(updatedAt || updatedBy) && (
          <p className="text-xs text-slate-400">
            Last updated
            {updatedAt ? ` on ${formatTimestamp(updatedAt)}` : ''}
            {updatedBy ? ` by ${updatedBy}` : ''}.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow transition ${
            !isDirty || saving
              ? 'cursor-not-allowed bg-primary/50'
              : 'bg-primary hover:bg-blue-600'
          }`}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={!isDirty}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Undo changes
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Reset to default
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-700">Active layout</h2>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {renderNodes(layout, 'root', null)}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-700">Default reference</h2>
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4">
            {defaults.map((group) => (
              <Fragment key={`ref-${group.key}`}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-base">
                    {group.icon ?? group.label.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                    {group.permissions.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Requires permissions: {group.permissions.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {group.children?.length ? (
                  <ul className="mb-4 ml-6 space-y-2 border-l border-dashed border-slate-300 pl-4">
                    {group.children.map((child) => (
                      <li key={`ref-${group.key}-${child.key}`} className="text-sm text-slate-600">
                        <span className="mr-2 text-slate-400">•</span>
                        {child.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
