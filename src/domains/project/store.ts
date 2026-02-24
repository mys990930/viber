import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

import type { ProjectInfo, ViberConfig } from '../../shared/types/project';

export interface ProjectStore {
  info: ProjectInfo | null;
  config: ViberConfig | null;
  isOpen: boolean;

  // loading / error states for async operations
  loading: boolean;
  error: string | null;

  // actions
  open: (path: string) => Promise<void>;
  close: () => Promise<void>;
  updateConfig: (patch: Partial<ViberConfig>) => Promise<void>;

  // internal setters
  setInfo: (info: ProjectInfo | null) => void;
  setConfig: (config: ViberConfig | null | ((prev: ViberConfig | null) => ViberConfig | null)) => void;
  setIsOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const toErrorMessage = (err: unknown): string => {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
};

export const useProjectStore = create<ProjectStore>((set) => ({
  info: null,
  config: null,
  isOpen: false,
  loading: false,
  error: null,

  open: async (path: string) => {
    set({ loading: true, error: null });
    try {
      const info = await invoke<ProjectInfo>('project_open', { path });
      const config = await invoke<ViberConfig>('project_get_config');
      set({ info, config, isOpen: true });
    } catch (err: unknown) {
      set({ error: toErrorMessage(err) });
    } finally {
      set({ loading: false });
    }
  },

  close: async () => {
    set({ loading: true, error: null });
    try {
      await invoke<void>('project_close');
      set({ info: null, config: null, isOpen: false });
    } catch (err: unknown) {
      set({ error: toErrorMessage(err) });
    } finally {
      set({ loading: false });
    }
  },

  updateConfig: async (patch: Partial<ViberConfig>) => {
    set({ loading: true, error: null });
    try {
      const next = await invoke<ViberConfig>('project_update_config', { config: patch });
      set({ config: next });
    } catch (err: unknown) {
      set({ error: toErrorMessage(err) });
    } finally {
      set({ loading: false });
    }
  },

  // internal setters
  setInfo: (info: ProjectInfo | null) => set({ info }),
  setConfig: (config) =>
    set((state) => ({
      config: typeof config === 'function' ? config(state.config) : config,
    })),
  setIsOpen: (isOpen: boolean) => set({ isOpen }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));

export default useProjectStore;
