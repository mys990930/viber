import { useGraphStore } from '../store';
import type { GraphDepth } from '../../../shared/types/graph';
import styles from './DepthToggle.module.css';

export function DepthToggle(): React.JSX.Element {
  const depth = useGraphStore((s) => s.depth);
  const setDepth = useGraphStore((s) => s.setDepth);

  const buttons: { label: string; value: GraphDepth }[] = [
    { label: 'Packages', value: 'packages' },
    { label: 'Modules', value: 'modules' },
  ];

  return (
    <div className={styles.container} role="tablist" aria-label="Graph depth toggle">
      {buttons.map((b) => (
        <button
          key={b.value}
          className={`${styles.button} ${depth === b.value ? styles.active : ''}`}
          onClick={() => setDepth(b.value)}
          type="button"
          aria-pressed={depth === b.value}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
