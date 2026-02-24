import { useGraphStore } from '../store';
import styles from './NodeTooltip.module.css';

function formatType(type?: string) {
  if (!type) return 'Unknown';
  const t = type.toLowerCase();
  if (t.includes('package')) return 'Package';
  if (t.includes('module')) return 'Module';
  if (t.includes('file')) return 'File';
  return type;
}

export function NodeTooltip(): React.ReactNode {
  const hoveredNodeId = useGraphStore((state) => state.hoveredNode);
  const nodes = useGraphStore((state) => state.nodes);

  if (!hoveredNodeId) return null;

  const node = nodes.find((n) => n.id === hoveredNodeId);
  if (!node) return null;

  return (
    <div className={styles.tooltip} data-node-id={node.id}>
      <div className={styles.label}>{node.label}</div>
      <div className={styles.meta}>
        <span className={styles.type}>{formatType(node.type)}</span>
        {node.path ? <span className={styles.path}>{node.path}</span> : null}
      </div>
    </div>
  );
}
