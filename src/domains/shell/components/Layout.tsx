import { type ReactNode } from 'react';
import { useShellStore } from '../store';
import styles from './Layout.module.css';
import { Toolbar } from './Toolbar';
import { StatusBar } from './StatusBar';

interface LayoutProps {
  sidebar?: ReactNode;
  canvas?: ReactNode;
  detail?: ReactNode;
}

export function Layout({ sidebar, canvas, detail }: LayoutProps) {
  const sidebarOpen = useShellStore((s) => s.sidebarOpen);
  const detailOpen = useShellStore((s) => s.detailOpen);

  return (
    <div className={styles.root}>
      <Toolbar />
      <div className={styles.body}>
        {sidebarOpen && (
          <aside className={styles.sidebar}>
            {sidebar}
          </aside>
        )}
        <main className={styles.canvas}>
          {canvas}
        </main>
        {detailOpen && (
          <aside className={styles.detail}>
            {detail}
          </aside>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
