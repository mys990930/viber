import { useState, useCallback } from 'react';
import type { InvokeArgs } from '@tauri-apps/api/core';

function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

type InvokeResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface UseTauriCommandResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  invoke: (params?: Record<string, unknown>) => Promise<InvokeResult<T>>;
}

/**
 * Tauri command invoke 래퍼.
 * 성공 시 { ok: true, data } / 실패 시 { ok: false, error } 반환.
 * void command 성공 시: { ok: true, data: null as T }.
 */
export function useTauriCommand<T>(cmd: string): UseTauriCommandResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (params?: Record<string, unknown>): Promise<InvokeResult<T>> => {
      setLoading(true);
      setError(null);
      try {
        if (!isTauri()) {
          throw new Error('Tauri is not available. Run with `pnpm tauri dev` for full functionality.');
        }
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<T>(cmd, params as InvokeArgs);
        setData(result);
        return { ok: true, data: result };
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? (e as { message: string }).message
            : String(e);
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [cmd],
  );

  return { data, loading, error, invoke: run };
}
