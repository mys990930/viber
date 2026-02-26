import { useGraphStore } from '../store';
import type { ViewMode } from '../store';
import styles from './ViewModeToggle.module.css';

export function ViewModeToggle(): React.JSX.Element {
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewMode = useGraphStore((s) => s.setViewMode);

  const buttons: { label: string; value: ViewMode }[] = [
    { label: 'Overview', value: 'overview' },
    { label: 'Architecture', value: 'architecture' },
  ];

  return (
    <div className={styles.container} role="tablist" aria-label="Graph view mode toggle">
      {buttons.map((b) => (
        <button
          key={b.value}
          className={`${styles.button} ${viewMode === b.value ? styles.active : ''}`}
          onClick={() => setViewMode(b.value)}
          type="button"
          aria-pressed={viewMode === b.value}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
