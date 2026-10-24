// Keeps the screen on while a read runs (decision 0005, "Screen kept awake"):
// asked for now, and again each time the page becomes visible, since the
// browser drops it when the page is hidden. A refusal or a browser without
// the API is fine: the read goes on.

type Sentinel = { release(): Promise<void> };
type WakeLockApi = { request(type: 'screen'): Promise<Sentinel> };

export function holdWakeLock(): { release(): void } {
  const api = (globalThis.navigator as { wakeLock?: WakeLockApi } | undefined)?.wakeLock;
  if (!api || typeof document === 'undefined') return { release() {} };
  let sentinel: Sentinel | null = null;
  let released = false;

  const request = async () => {
    try {
      const lock = await api.request('screen');
      if (released) await lock.release();
      else sentinel = lock;
    } catch {
      // Refused, for example in power-saving mode.
    }
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') void request();
  };

  void request();
  document.addEventListener('visibilitychange', onVisible);
  return {
    release() {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    },
  };
}
