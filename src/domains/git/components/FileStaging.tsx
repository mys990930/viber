import { useMemo } from 'react';
import styles from './GitPanel.module.css';

interface FileStagingProps {
  staged: string[];
  modified: string[];
  untracked: string[];
  selected: string[];
  onToggleSelected: (path: string) => void;
  onStage: (paths: string[]) => void;
  onUnstage: (paths: string[]) => void;
}

export function FileStaging({
  staged,
  modified,
  untracked,
  selected,
  onToggleSelected,
  onStage,
  onUnstage,
}: FileStagingProps) {
  const unstaged = useMemo(() => [...modified, ...untracked], [modified, untracked]);

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>Files</div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Staged ({staged.length})</div>
        {staged.length === 0 && <div className={styles.muted}>No staged files</div>}
        {staged.map((path) => (
          <label key={`staged:${path}`} className={styles.fileRow}>
            <input type="checkbox" checked={selected.includes(path)} onChange={() => onToggleSelected(path)} />
            <span className={styles.filePath}>{path}</span>
            <button className={styles.linkButton} onClick={() => onUnstage([path])}>Unstage</button>
          </label>
        ))}
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Unstaged ({unstaged.length})</div>
        {unstaged.length === 0 && <div className={styles.muted}>No unstaged files</div>}
        {unstaged.map((path) => (
          <label key={`unstaged:${path}`} className={styles.fileRow}>
            <input type="checkbox" checked={selected.includes(path)} onChange={() => onToggleSelected(path)} />
            <span className={styles.filePath}>{path}</span>
            <button className={styles.linkButton} onClick={() => onStage([path])}>Stage</button>
          </label>
        ))}
      </div>
    </div>
  );
}
