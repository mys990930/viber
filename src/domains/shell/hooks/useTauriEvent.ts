import { useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

/**
 * Tauri event 구독 래퍼.
 * 컴포넌트 언마운트 시 자동 cleanup.
 *
 * @example
 * useTauriEvent<GraphDiff>('graph:updated', (diff) => {
 *   applyDiff(diff);
 * });
 */
export function useTauriEvent<T>(event: string, handler: (payload: T) => void) {
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<T>(event, (e) => {
      handler(e.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [event, handler]);
}
