import { useState, useCallback } from 'react';
import { useTauriCommand } from '../../shell';

export interface SymbolItem {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'type';
}

// Check if running in Tauri environment
function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

export function useSymbols(edgeId: string | null) {
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const { loading, error, invoke } = useTauriCommand<{ symbols: SymbolItem[] }>('graph_edge_symbols');

  const loadSymbols = useCallback(async () => {
    if (!edgeId) {
      setSymbols([]);
      return;
    }

    if (!isTauri()) {
      // Browser / fallback: return mock symbols after delay
      await new Promise((r) => setTimeout(r, 450));
      setSymbols([
        { name: 'doSomething', kind: 'function' },
        { name: 'MyClass', kind: 'class' },
        { name: 'CONST_VALUE', kind: 'variable' },
      ]);
      return;
    }

    // Tauri mode: call backend
    const result = await invoke({ edgeId });
    if (result) {
      setSymbols(result.symbols);
    }
  }, [edgeId, invoke]);

  return { symbols, loading, error, loadSymbols };
}
