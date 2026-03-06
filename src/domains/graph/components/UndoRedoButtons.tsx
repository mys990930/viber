import { useGraphStore } from '../store';
import styles from './UndoRedoButtons.module.css';

export function UndoRedoButtons() {
  const undoStack = useGraphStore((s) => s.undoStack);
  const redoStack = useGraphStore((s) => s.redoStack);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <span className={styles.icon}>↶</span>
      </button>
      <button
        className={styles.button}
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        <span className={styles.icon}>↷</span>
      </button>
    </div>
  );
}
