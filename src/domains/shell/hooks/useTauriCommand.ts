import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UseTauriCommandResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  invoke: (params?: Record<string, unknown>) => Promise<T | null>;
}

/**
 * Tauri command invoke 래퍼.
 * 에러 핸들링 + 로딩 상태를 자동 관리.
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
        const result = await invoke<T>(cmd, params);
        setData(result);
        return result;
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? (e as { message: string }).message
            : String(e);
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cmd],
  );

  return { data, loading, error, invoke: run };
}
