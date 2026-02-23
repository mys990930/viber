import { useState, useCallback } from 'react';

interface UndoRedoState<T> {
  past: T[];
  future: T[];
}

interface UseUndoRedoResult<T> {
  push: (state: T) => void;
  undo: () => T | undefined;
  redo: () => T | undefined;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

/**
 * 범용 Undo/Redo 스택.
 *
 * @param maxHistory 최대 히스토리 수 (기본 50)
 * @example
 * const { push, undo, redo, canUndo } = useUndoRedo<LayoutSnapshot>(50);
 * push(currentLayout);
 * const prev = undo();
 */
export function useUndoRedo<T>(maxHistory = 50): UseUndoRedoResult<T> {
  const [stack, setStack] = useState<UndoRedoState<T>>({
    past: [],
    future: [],
  });

  const push = useCallback(
    (state: T) => {
      setStack((s) => ({
        past: [...s.past, state].slice(-maxHistory),
        future: [],
      }));
    },
    [maxHistory],
  );

  const undo = useCallback((): T | undefined => {
    let result: T | undefined;
    setStack((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      result = prev;
      return {
        past: s.past.slice(0, -1),
        future: [prev, ...s.future],
      };
    });
    return result;
  }, []);

  const redo = useCallback((): T | undefined => {
    let result: T | undefined;
    setStack((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      result = next;
      return {
        past: [...s.past, next],
        future: s.future.slice(1),
      };
    });
    return result;
  }, []);

  const clear = useCallback(() => {
    setStack({ past: [], future: [] });
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: stack.past.length > 0,
    canRedo: stack.future.length > 0,
    clear,
  };
}
