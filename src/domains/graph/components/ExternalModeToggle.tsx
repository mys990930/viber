import { useGraphStore, type ExternalMode } from '../store';
import styles from './ExternalModeToggle.module.css';

const MODES: { value: ExternalMode; label: string }[] = [
  { value: 'hidden', label: 'Hide' },
  { value: 'dim', label: 'Dim' },
  { value: 'visible', label: 'Show' },
];

export function ExternalModeToggle() {
  const externalMode = useGraphStore((s) => s.externalMode);
  const setExternalMode = useGraphStore((s) => s.setExternalMode);

  return (
    <div className={styles.toggle}>
      {MODES.map((mode) => (
        <button
          key={mode.value}
          className={`${styles.button} ${externalMode === mode.value ? styles.active : ''}`}
          onClick={() => setExternalMode(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
