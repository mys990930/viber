import { useShellStore } from '../store';
import styles from './Toolbar.module.css';

export function Toolbar() {
  const toggleSidebar = useShellStore((s) => s.toggleSidebar);

  return (
    <div className={styles.toolbar} data-tauri-drag-region>
      <div className={styles.left}>
        <button className={styles.iconBtn} onClick={toggleSidebar} title="Toggle sidebar">
          ☰
        </button>
        <span className={styles.title}>Viber</span>
      </div>
      <div className={styles.center}>
        {/* Flow EntryPicker, DepthToggle 등이 들어올 자리 */}
      </div>
      <div className={styles.right}>
        {/* ScoreCard, ExternalToggle 등이 들어올 자리 */}
      </div>
    </div>
  );
}
