import { useEffect, useState } from 'react';
import { useGraphStore } from '../store';
import { useSymbols } from '../hooks/useSymbols';
import styles from './EdgeDetail.module.css';

export function EdgeDetail(): React.ReactNode {
  const hoveredEdgeId = useGraphStore((state) => state.hoveredEdge);
  const edges = useGraphStore((state) => state.edges);
  const nodes = useGraphStore((state) => state.nodes);
  
  const edge = edges.find((e) => e.id === hoveredEdgeId);
  const edgeId = edge?.id ?? null;
  
  const { symbols, loading, loadSymbols } = useSymbols(edgeId);
  const [didLoadOnce, setDidLoadOnce] = useState(false);

  useEffect(() => {
    if (!edgeId) return;
    setDidLoadOnce(false);
    loadSymbols().then(() => setDidLoadOnce(true)).catch(() => setDidLoadOnce(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeId]);

  if (!edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.names}>
          {sourceNode?.label ?? edge.source} → {targetNode?.label ?? edge.target}
        </div>
      </div>
      <div className={styles.type}>Type: {formatKind(edge.kind)}</div>

      <div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Imported symbols</div>
        {loading && !didLoadOnce && <div className={styles.loading}>Loading symbols…</div>}
        {!loading && symbols.length === 0 && didLoadOnce && (
          <div className={styles.empty}>No symbols imported through this edge.</div>
        )}
        <div className={styles.symbolList}>
          {symbols.map((s) => (
            <div key={s.name} className={styles.symbol}>
              <div>{s.name}</div>
              <div className={styles.kind}>{s.kind}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatKind(kind: string) {
  switch (kind) {
    case 'package_dep': return 'Package Dependency';
    case 'module_import': return 'Module Import';
    case 'file_import': return 'File Import';
    default: return kind;
  }
}
