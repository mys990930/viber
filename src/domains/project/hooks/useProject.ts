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
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
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

// Browser mode: clear localStorage
function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.info);
    localStorage.removeItem(STORAGE_KEYS.config);
    localStorage.removeItem(STORAGE_KEYS.recent);
  } catch {
    // ignore
  }
}

function getPathValidationError(path: string, isBrowserMode: boolean): string | null {
  const trimmed = path.trim();
  if (!trimmed) {
    return 'Invalid path: path cannot be empty';
  }

  // In browser fallback we cannot verify real filesystem existence,
  // so enforce stricter input format to catch obvious bad paths.
  if (isBrowserMode) {
    const isUnixAbs = trimmed.startsWith('/');
    const isWindowsAbs = /^[a-zA-Z]:\\/.test(trimmed);
    if (!isUnixAbs && !isWindowsAbs) {
      return 'Invalid path: use an absolute path (e.g. /Users/name/project)';
    }
  }

  return null;
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
  const isBrowserMode = !isTauri();

  // Tauri commands (only used in Tauri mode)
  const validatePathCmd = useTauriCommand<void>('project_validate_path');
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
    if (items.ok && items.data) {
      setRecent(items.data);
    }
  }, [isBrowserMode, recentCmd]);

  const refreshConfig = useCallback(async () => {
    if (isBrowserMode) {
      // Browser mode: already loaded from localStorage
      return;
    }
    const nextConfig = await getConfigCmd.invoke();
    if (nextConfig.ok && nextConfig.data) {
      setConfig(nextConfig.data);
    }
  }, [getConfigCmd, isBrowserMode, setConfig]);

  const openProject = useCallback(
    async (path: string) => {
      const pathError = getPathValidationError(path, isBrowserMode);
      if (pathError) {
        setError(pathError);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (isBrowserMode) {
          setError('Project open is not supported in web fallback. Run `pnpm tauri dev`.');
          return;
        }

        console.log('[project] openProject: validating path:', path);
        const validResult = await validatePathCmd.invoke({ path });
        console.log('[project] openProject: validate result:', validResult);
        if (!validResult.ok) {
          setError(validResult.error);
          return;
        }

        console.log('[project] openProject: opening...');
        const openResult = await openCmd.invoke({ path });
        console.log('[project] openProject: open result:', openResult);
        if (!openResult.ok) {
          setError(openResult.error);
          return;
        }
        const nextInfo = openResult.data;
        if (!nextInfo) return;

        console.log('[project] openProject: setting info, isOpen=true');
        setInfo(nextInfo);
        setIsOpen(true);

        await Promise.all([refreshConfig(), refreshRecent()]);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    },
    [
      isBrowserMode,
      validatePathCmd,
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
      setRecent([]);
      
      // Clear localStorage in browser mode
      if (isBrowserMode) {
        clearStorage();
      }
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
          if (nextConfig.ok && nextConfig.data) {
            setConfig(nextConfig.data);
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
    validatePathCmd.loading ||
    openCmd.loading ||
    closeCmd.loading ||
    getConfigCmd.loading ||
    updateConfigCmd.loading ||
    recentCmd.loading;

  const error =
    storeError ||
    validatePathCmd.error ||
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
