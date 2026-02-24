import { useEffect } from 'react';
import type { UnlistenFn } from '@tauri-apps/api/event';

// Check if running in Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

/**
 * Tauri event 구독 래퍼.
 * 컴포넌트 언마운트 시 자동 cleanup.
 * 브라우저 환경에서는 no-op.
 *
 * @example
 * useTauriEvent<GraphDiff>('graph:updated', (diff) => {
 *   applyDiff(diff);
 * });
 */
export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  useEffect(() => {
    if (!isTauri()) {
      // Browser mode: no-op
      return;
    }

    let unlisten: UnlistenFn | undefined;

    // Dynamic import to avoid errors in browser mode
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<T>(event, (e) => {
        handler(e.payload);
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      unlisten?.();
    };
  }, [event, handler]);
}
