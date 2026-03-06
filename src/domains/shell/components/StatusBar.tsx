import { useGit } from '../../git';
import styles from './StatusBar.module.css';

export function StatusBar() {
  const { status } = useGit();

  return (
    <div className={styles.statusbar}>
      <div className={styles.left}>
        {status ? (
          <span className={styles.item}> {status.branch} · ↑{status.ahead} ↓{status.behind}</span>
        ) : (
          <span className={styles.item}>⚡ No project open</span>
        )}
      </div>
      <div className={styles.right}>
        <span className={styles.item}>Viber v0.1.0</span>
      </div>
    </div>
  );
}
