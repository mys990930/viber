import { create } from 'zustand';

interface ShellStore {
  sidebarOpen: boolean;
  detailOpen: boolean;
  activeDetailTab: string | null;

  toggleSidebar: () => void;
  toggleDetail: () => void;
  setDetailTab: (tab: string | null) => void;
}

export const useShellStore = create<ShellStore>((set) => ({
  sidebarOpen: true,
  detailOpen: false,
  activeDetailTab: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleDetail: () => set((s) => ({ detailOpen: !s.detailOpen })),
  setDetailTab: (tab) => set({ activeDetailTab: tab, detailOpen: tab !== null }),
}));
