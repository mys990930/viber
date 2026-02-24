import { useState } from 'react';
import styles from './ProjectSelector.module.css';
import { useProject } from '../hooks/useProject';

// Check if running in Tauri environment
function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

export function ProjectSelector(): React.JSX.Element {
  const { openProject, closeProject, isOpen, info, loading, error, recent } = useProject();
  const [working] = useState(false);

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
              <div className={styles.buttonGroup}>
                <button className={styles.ghost} onClick={handleOpenFolder} disabled={working || loading}>
                  Change
                </button>
                <button className={styles.danger} onClick={closeProject} disabled={loading}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Recent Projects</h4>
        {working && <div className={styles.muted}>Loading recent projects...</div>}
        {!working && recent.length === 0 && <div className={styles.muted}>No recent projects</div>}

        <ul className={styles.list}>
          {recent.map((r) => (
            <li key={r.root} className={styles.item}>
              <button className={styles.itemBtn} onClick={() => handleOpenRecent(r.root)}>
                <div className={styles.itemMain}>{r.name}</div>
                <div className={styles.itemAction}>Open</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
