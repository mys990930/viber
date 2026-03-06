import { useState } from 'react';
import styles from './GitPanel.module.css';

interface CommitFormProps {
  selectedPaths: string[];
  onCommit: (message: string, paths?: string[]) => Promise<void>;
  busy?: boolean;
}

export function CommitForm({ selectedPaths, onCommit, busy = false }: CommitFormProps) {
  const [message, setMessage] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);

  async function handleCommit() {
    if (!message.trim()) return;
    await onCommit(message.trim(), onlySelected ? selectedPaths : undefined);
    setMessage('');
  }

  return (
    <div className={styles.block}>
      <div className={styles.blockTitle}>Commit</div>
      <textarea
        className={styles.textarea}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message"
        rows={3}
      />
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={onlySelected}
          onChange={(e) => setOnlySelected(e.target.checked)}
          disabled={selectedPaths.length === 0}
        />
        Commit only selected files ({selectedPaths.length})
      </label>
      <button className={styles.primaryButton} onClick={() => void handleCommit()} disabled={busy || !message.trim()}>
        Commit
      </button>
    </div>
  );
}
