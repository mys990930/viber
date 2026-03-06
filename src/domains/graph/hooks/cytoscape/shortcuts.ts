export function bindUndoRedoShortcuts(params: { undo: () => void; redo: () => void }) {
  const { undo, redo } = params;

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (!isCtrl) return;

    // Ctrl+Z (or Cmd+Z) → Undo
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Ctrl+Shift+Z or Ctrl+Y → Redo
    else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      redo();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
