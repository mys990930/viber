import { useGraphStore } from '../store';
import styles from './FloatingToggle.module.css';

export function FloatingToggle(): React.JSX.Element {
  const floatingEnabled = useGraphStore((s) => s.floatingEnabled);
  const toggleFloating = useGraphStore((s) => s.toggleFloating);

  return (
    <label className={styles.switch} aria-label="Live floating toggle">
      <input
        type="checkbox"
        checked={floatingEnabled}
        onChange={toggleFloating}
      />
      <span className={styles.slider} />
    </label>
  );
}
