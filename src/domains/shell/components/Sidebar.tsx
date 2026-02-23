import styles from './Sidebar.module.css';
import { type ReactNode } from 'react';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function SidebarSection({ title, children, defaultOpen = true }: SidebarSectionProps) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.sectionTitle}>{title}</summary>
      <div className={styles.sectionContent}>
        {children}
      </div>
    </details>
  );
}

interface SidebarProps {
  children?: ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <div className={styles.sidebar}>
      {children || (
        <div className={styles.empty}>
          <span className={styles.emptyText}>프로젝트를 열어주세요</span>
        </div>
      )}
    </div>
  );
}
