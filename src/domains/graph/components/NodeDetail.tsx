import { useGraphStore } from '../store';
import styles from './NodeDetail.module.css';

export function NodeDetail(): React.ReactNode {
  const selectedNodeId = useGraphStore((state) => state.selectedNode);
  const nodes = useGraphStore((state) => state.nodes);

  if (!selectedNodeId) return null;

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  return (
    <div className={styles.container} data-node-id={node.id}>
      <header className={styles.header}>
        <h3 className={styles.title}>{node.label}</h3>
        <div className={styles.type}>{formatType(node.type)}</div>
      </header>

      <section className={styles.section}>
        <div className={styles.row}>
          <div className={styles.key}>Full path</div>
          <div className={styles.value}>{node.path ?? '—'}</div>
        </div>

        <div className={styles.row}>
          <div className={styles.key}>Language</div>
          <div className={styles.value}>{node.language ?? '—'}</div>
        </div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.subTitle}>Imports</h4>
        <div className={styles.placeholder}>Not implemented yet</div>
      </section>

      <section className={styles.section}>
        <h4 className={styles.subTitle}>Exports</h4>
        <div className={styles.placeholder}>Not implemented yet</div>
      </section>
    </div>
  );
}

function formatType(type?: string) {
  if (!type) return 'Unknown';
  const t = type.toLowerCase();
  if (t.includes('package')) return 'Package';
  if (t.includes('module')) return 'Module';
  if (t.includes('file')) return 'File';
  return type;
}
