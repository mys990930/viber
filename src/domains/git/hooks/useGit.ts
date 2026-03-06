import { useCallback, useEffect, useMemo } from 'react';
import { useTauriCommand, useTauriEvent } from '../../shell';
import { useGitStore } from '../store';
import type { BranchInfo, CommitResult, GitStatus } from '../../../shared/types/git';

function isCommandUnavailable(error: string): boolean {
  const e = error.toLowerCase();
  return e.includes('unknown') || e.includes('not found') || e.includes('command') || e.includes('invalid args');
}

export function useGit() {
  const {
    status,
    branches,
    loading: storeLoading,
    error: storeError,
    branchOpsAvailable,
    initialized,
    setStatus,
    setBranches,
    setLoading,
    setError,
    setBranchOpsAvailable,
    setInitialized,
  } = useGitStore();

  const statusCmd = useTauriCommand<GitStatus>('git_status');
  const branchesCmd = useTauriCommand<BranchInfo[]>('git_branches');
  const stageCmd = useTauriCommand<void>('git_stage');
  const unstageCmd = useTauriCommand<void>('git_unstage');
  const commitCmd = useTauriCommand<CommitResult>('git_commit');
  const createBranchCmd = useTauriCommand<void>('git_create_branch');
  const checkoutCmd = useTauriCommand<void>('git_checkout');

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    const result = await statusCmd.invoke();
    if (result.ok && result.data) {
      setStatus(result.data);
      setError(null);
    } else if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, [setError, setLoading, setStatus, statusCmd]);

  const refreshBranches = useCallback(async () => {
    const result = await branchesCmd.invoke();
    if (result.ok && result.data) {
      setBranches(result.data);
      setBranchOpsAvailable(true);
      return;
    }
    if (!result.ok && isCommandUnavailable(result.error)) {
      setBranchOpsAvailable(false);
      return;
    }
    if (!result.ok) {
      setError(result.error);
    }
  }, [branchesCmd, setBranchOpsAvailable, setBranches, setError]);

  const stage = useCallback(
    async (paths: string[]) => {
      const result = await stageCmd.invoke({ paths });
      if (result.ok) {
        await refreshStatus();
      } else {
        setError(result.error);
      }
    },
    [refreshStatus, setError, stageCmd],
  );

  const unstage = useCallback(
    async (paths: string[]) => {
      const result = await unstageCmd.invoke({ paths });
      if (result.ok) {
        await refreshStatus();
      } else {
        setError(result.error);
      }
    },
    [refreshStatus, setError, unstageCmd],
  );

  const commit = useCallback(
    async (message: string, paths?: string[]) => {
      const result = await commitCmd.invoke({ message, paths: paths && paths.length > 0 ? paths : undefined });
      if (result.ok) {
        await refreshStatus();
      } else {
        setError(result.error);
      }
      return result;
    },
    [commitCmd, refreshStatus, setError],
  );

  const createBranch = useCallback(
    async (name: string, checkout = true) => {
      if (!branchOpsAvailable) return;
      const result = await createBranchCmd.invoke({ name, checkout });
      if (result.ok) {
        await Promise.all([refreshStatus(), refreshBranches()]);
      } else if (isCommandUnavailable(result.error)) {
        setBranchOpsAvailable(false);
      } else {
        setError(result.error);
      }
    },
    [branchOpsAvailable, createBranchCmd, refreshBranches, refreshStatus, setBranchOpsAvailable, setError],
  );

  const checkout = useCallback(
    async (branch: string) => {
      if (!branchOpsAvailable) return;
      const result = await checkoutCmd.invoke({ branch });
      if (result.ok) {
        await Promise.all([refreshStatus(), refreshBranches()]);
      } else if (isCommandUnavailable(result.error)) {
        setBranchOpsAvailable(false);
      } else {
        setError(result.error);
      }
    },
    [branchOpsAvailable, checkoutCmd, refreshBranches, refreshStatus, setBranchOpsAvailable, setError],
  );

  useTauriEvent<GitStatus>('git:status_changed', (next) => {
    setStatus(next);
  });

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    void refreshStatus();
    void refreshBranches();
  }, [initialized, refreshBranches, refreshStatus, setInitialized]);

  const loading =
    storeLoading ||
    statusCmd.loading ||
    branchesCmd.loading ||
    stageCmd.loading ||
    unstageCmd.loading ||
    commitCmd.loading ||
    createBranchCmd.loading ||
    checkoutCmd.loading;

  const error =
    storeError ||
    statusCmd.error ||
    branchesCmd.error ||
    stageCmd.error ||
    unstageCmd.error ||
    commitCmd.error ||
    createBranchCmd.error ||
    checkoutCmd.error;

  return useMemo(
    () => ({
      status,
      branches,
      loading,
      error,
      branchOpsAvailable,
      refreshStatus,
      refreshBranches,
      stage,
      unstage,
      commit,
      createBranch,
      checkout,
    }),
    [
      status,
      branches,
      loading,
      error,
      branchOpsAvailable,
      refreshStatus,
      refreshBranches,
      stage,
      unstage,
      commit,
      createBranch,
      checkout,
    ],
  );
}
