import { create } from 'zustand';
import type { BranchInfo, GitStatus } from '../../shared/types/git';

interface GitStore {
  status: GitStatus | null;
  branches: BranchInfo[];
  loading: boolean;
  error: string | null;
  branchOpsAvailable: boolean;
  initialized: boolean;
  setStatus: (status: GitStatus | null) => void;
  setBranches: (branches: BranchInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setBranchOpsAvailable: (available: boolean) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useGitStore = create<GitStore>((set) => ({
  status: null,
  branches: [],
  loading: false,
  error: null,
  branchOpsAvailable: true,
  initialized: false,
  setStatus: (status) => set({ status }),
  setBranches: (branches) => set({ branches }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setBranchOpsAvailable: (available) => set({ branchOpsAvailable: available }),
  setInitialized: (initialized) => set({ initialized }),
}));
