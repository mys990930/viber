import { useEffect, useState } from 'react';
import styles from './ProjectSelector.module.css';
import { useProject } from '../hooks/useProject';

// Check if running in Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

export function ProjectSelector(): React.JSX.Element {
  const { openProject, isOpen, info, loading } = useProject();
  const [recent, setRecent] = useState<string[]>([]);
  const [working] = useState(false);

  useEffect(() => {
    // TODO: Load recent projects from backend
    // For now, use empty list
    setRecent([]);
  }, []);

  async function handleOpenFolder() {
    let path: string | null = null;

    if (isTauri()) {
      // Tauri mode: use native dialog
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Folder',
      });
      if (selected && typeof selected === 'string') {
        path = selected;
      }
    } else {
      // Browser mode: use prompt
      path = window.prompt('Enter project path (Tauri not available):');
    }

    if (path) {
      await openProject(path);
    }
  }

  async function handleOpenRecent(path: string) {
    try {
      await openProject(path);
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Project</h3>
        <div className={styles.actions}>
          {!isOpen && (
            <button className={styles.primary} onClick={handleOpenFolder} disabled={working || loading}>
              {working || loading ? 'Opening...' : 'Open Project'}
            </button>
          )}

          {isOpen && (
            <div className={styles.openInfo}>
              <span className={styles.projectName}>{info?.name || 'Current Project'}</span>
              <button className={styles.ghost} onClick={handleOpenFolder} disabled={working || loading}>
                Change
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Recent Projects</h4>
        {working && <div className={styles.muted}>Loading recent projects...</div>}
        {!working && recent.length === 0 && <div className={styles.muted}>No recent projects</div>}

        <ul className={styles.list}>
          {recent.map((r) => (
            <li key={r} className={styles.item}>
              <button className={styles.itemBtn} onClick={() => handleOpenRecent(r)}>
                <div className={styles.itemMain}>{r}</div>
                <div className={styles.itemAction}>Open</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
