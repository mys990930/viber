import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTauriCommand, useTauriEvent } from '../../shell';
import { useProjectStore } from '../store';

import type { ProjectInfo, ViberConfig } from '../../../shared/types/project';
import type { FileEvent } from '../../../shared/types/watcher';

interface RecentProject {
  name: string;
  root: string;
}

// Check if running in Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// Browser mode: localStorage keys
const STORAGE_KEYS = {
  info: 'viber:project:info',
  config: 'viber:project:config',
  recent: 'viber:project:recent',
};

// Browser mode: get default config
function getDefaultConfig(): ViberConfig {
  return {
    languages: ['typescript'],
    excludedPaths: ['node_modules', 'dist', '.git'],
  };
}

// Browser mode: load from localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Browser mode: save to localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useProject() {
  const {
    info,
    config,
    isOpen,
    loading: storeLoading,
    error: storeError,
    setInfo,
    setConfig,
    setIsOpen,
    setLoading,
    setError,
  } = useProjectStore();

  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [isBrowserMode] = useState(() => !isTauri());

  // Tauri commands (only used in Tauri mode)
  const openCmd = useTauriCommand<ProjectInfo>('project_open');
  const closeCmd = useTauriCommand<void>('project_close');
  const getConfigCmd = useTauriCommand<ViberConfig>('project_get_config');
  const updateConfigCmd = useTauriCommand<ViberConfig>('project_update_config');
  const recentCmd = useTauriCommand<RecentProject[]>('project_recent');

  // Browser mode: load initial data from localStorage
  useEffect(() => {
    if (!isBrowserMode) return;

    const storedInfo = loadFromStorage<ProjectInfo | null>(STORAGE_KEYS.info, null);
    const storedConfig = loadFromStorage<ViberConfig | null>(STORAGE_KEYS.config, null);
    const storedRecent = loadFromStorage<RecentProject[]>(STORAGE_KEYS.recent, []);

    if (storedInfo) {
      setInfo(storedInfo);
      setIsOpen(true);
    }
    if (storedConfig) {
      setConfig(storedConfig);
    }
    setRecent(storedRecent);
  }, [isBrowserMode, setConfig, setInfo, setIsOpen]);

  // Browser mode: save to localStorage when data changes
  useEffect(() => {
    if (!isBrowserMode) return;
    saveToStorage(STORAGE_KEYS.info, info);
  }, [info, isBrowserMode]);

  useEffect(() => {
    if (!isBrowserMode) return;
    saveToStorage(STORAGE_KEYS.config, config);
  }, [config, isBrowserMode]);

  useEffect(() => {
    if (!isBrowserMode) return;
    saveToStorage(STORAGE_KEYS.recent, recent);
  }, [recent, isBrowserMode]);

  const refreshRecent = useCallback(async () => {
    if (isBrowserMode) {
      // Browser mode: already loaded from localStorage
      return;
    }
    const items = await recentCmd.invoke();
    if (items) {
      setRecent(items);
    }
  }, [isBrowserMode, recentCmd]);

  const refreshConfig = useCallback(async () => {
    if (isBrowserMode) {
      // Browser mode: already loaded from localStorage
      return;
    }
    const nextConfig = await getConfigCmd.invoke();
    if (nextConfig) {
      setConfig(nextConfig);
    }
  }, [getConfigCmd, isBrowserMode, setConfig]);

  const openProject = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);

      try {
        if (isBrowserMode) {
          // Browser mode: create mock project info
          const pathParts = path.split('/').filter(Boolean);
          const name = pathParts[pathParts.length - 1] || 'Unknown';

          const mockInfo: ProjectInfo = {
            name,
            root: path,
            languages: ['typescript'],
          };

          setInfo(mockInfo);
          setIsOpen(true);

          // Set default config if not exists
          setConfig((prev) => prev || getDefaultConfig());

          // Add to recent
          setRecent((prev) => {
            const filtered = prev.filter((p) => p.root !== path);
            return [{ name, root: path }, ...filtered].slice(0, 10);
          });
        } else {
          // Tauri mode: use backend
          const nextInfo = await openCmd.invoke({ path });
          if (!nextInfo) return;

          setInfo(nextInfo);
          setIsOpen(true);

          await Promise.all([refreshConfig(), refreshRecent()]);
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [
      isBrowserMode,
      openCmd,
      refreshConfig,
      refreshRecent,
      setConfig,
      setError,
      setInfo,
      setIsOpen,
      setLoading,
    ],
  );

  const closeProject = useCallback(async () => {
    setLoading(true);

    try {
      if (!isBrowserMode) {
        await closeCmd.invoke();
      }

      setInfo(null);
      setConfig(null);
      setIsOpen(false);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [closeCmd, isBrowserMode, setConfig, setError, setInfo, setIsOpen, setLoading]);

  const updateConfig = useCallback(
    async (patch: Partial<ViberConfig>) => {
      setLoading(true);

      try {
        if (isBrowserMode) {
          // Browser mode: merge and save locally
          setConfig((prev) => {
            const current = prev || getDefaultConfig();
            const next = { ...current, ...patch };
            return next;
          });
        } else {
          // Tauri mode: use backend
          const nextConfig = await updateConfigCmd.invoke({ config: patch });
          if (nextConfig) {
            setConfig(nextConfig);
          }
        }
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [isBrowserMode, setConfig, setError, setLoading, updateConfigCmd],
  );

  const onFileChanged = useCallback((event: FileEvent) => {
    console.log('[project:file_changed]', event);
  }, []);

  useTauriEvent<FileEvent>('project:file_changed', onFileChanged);

  const loading =
    storeLoading ||
    openCmd.loading ||
    closeCmd.loading ||
    getConfigCmd.loading ||
    updateConfigCmd.loading ||
    recentCmd.loading;

  const error =
    storeError ||
    openCmd.error ||
    closeCmd.error ||
    getConfigCmd.error ||
    updateConfigCmd.error ||
    recentCmd.error;

  return useMemo(
    () => ({
      info,
      config,
      isOpen,
      recent,
      loading,
      error,
      openProject,
      closeProject,
      updateConfig,
      refreshConfig,
      refreshRecent,
    }),
    [
      closeProject,
      config,
      error,
      info,
      isOpen,
      loading,
      openProject,
      recent,
      refreshConfig,
      refreshRecent,
      updateConfig,
    ],
  );
}

export default useProject;
