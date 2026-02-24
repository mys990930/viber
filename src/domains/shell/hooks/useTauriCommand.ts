import { useState, useCallback } from 'react';
import type { InvokeArgs } from '@tauri-apps/api/core';

// Check if running in Tauri environment
function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

interface UseTauriCommandResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  invoke: (params?: Record<string, unknown>) => Promise<T | null>;
}

/**
 * Tauri command invoke 래퍼.
 * 에러 핸들링 + 로딩 상태를 자동 관리.
 * 브라우저 환경에서는 mock 응답 또는 에러 반환.
 *
 * @example
 * const { data, loading, invoke } = useTauriCommand<ProjectInfo>('project:open');
 * await invoke({ path: '/some/dir' });
 */
export function useTauriCommand<T>(cmd: string): UseTauriCommandResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (params?: Record<string, unknown>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        if (!isTauri()) {
          throw new Error('Tauri is not available. Run with `pnpm tauri dev` for full functionality.');
        }
        // Dynamic import to avoid errors in browser mode
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<T>(cmd, params as InvokeArgs);
        setData(result);
        return result;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? (e as { message: string }).message
            : String(e);
        setError(msg);
        throw e; // 에러를 re-throw → 호출자가 try/catch로 처리 가능
      } finally {
        setLoading(false);
      }
    },
    [cmd],
  );

  return { data, loading, error, invoke: run };
}
