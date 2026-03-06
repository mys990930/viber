import { useState } from 'react';
import type { BranchInfo } from '../../../shared/types/git';
import styles from './GitPanel.module.css';

interface BranchSelectProps {
  branchOpsAvailable: boolean;
  currentBranch?: string;
  branches: BranchInfo[];
  onCheckout: (branch: string) => void;
  onCreate: (name: string) => void;
}

export function BranchSelect({
  branchOpsAvailable,
  currentBranch,
  branches,
  onCheckout,
  onCreate,
}: BranchSelectProps) {
  const [newBranch, setNewBranch] = useState('');

  if (!branchOpsAvailable) {
    return <div className={styles.note}>Branch commands unavailable in current backend build.</div>;
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>Branch</div>
      <select
        className={styles.select}
        value={currentBranch || ''}
        onChange={(e) => onCheckout(e.target.value)}
      >
        {(branches.length > 0 ? branches : [{ name: currentBranch || '', current: true }]).map((b) => (
          <option key={b.name} value={b.name}>
            {b.current ? '● ' : ''}
            {b.name}
          </option>
        ))}
      </select>

      <div className={styles.inlineRow}>
        <input
          className={styles.input}
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          placeholder="new-branch-name"
        />
        <button
          className={styles.secondaryButton}
          onClick={() => {
            if (!newBranch.trim()) return;
            onCreate(newBranch.trim());
            setNewBranch('');
          }}
        >
          Create
        </button>
      </div>
    </div>
  );
}
