import { useState } from 'react';
import { useGit } from '../hooks/useGit';
import { BranchSelect } from './BranchSelect';
import { CommitForm } from './CommitForm';
import { FileStaging } from './FileStaging';
import styles from './GitPanel.module.css';

export function GitPanel() {
  const { status, branches, loading, error, branchOpsAvailable, stage, unstage, commit, checkout, createBranch } = useGit();
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelected(path: string) {
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  }

  if (!status) {
    return <div className={styles.muted}>Git status unavailable.</div>;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.branch}> {status.branch}</span>
        <span className={styles.sync}>↑{status.ahead} ↓{status.behind}</span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <BranchSelect
        branchOpsAvailable={branchOpsAvailable}
        currentBranch={status.branch}
        branches={branches}
        onCheckout={(branch) => void checkout(branch)}
        onCreate={(name) => void createBranch(name, true)}
      />

      <FileStaging
        staged={status.staged}
        modified={status.modified}
        untracked={status.untracked}
        selected={selected}
        onToggleSelected={toggleSelected}
        onStage={(paths) => void stage(paths)}
        onUnstage={(paths) => void unstage(paths)}
      />

      <CommitForm
        selectedPaths={selected}
        busy={loading}
        onCommit={async (message, paths) => {
          await commit(message, paths);
          setSelected([]);
        }}
      />
    </div>
  );
}
