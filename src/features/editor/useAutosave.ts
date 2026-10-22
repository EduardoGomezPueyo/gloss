import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Saves `value` a short pause after the last change (Figma: "All changes saved").
 * Pending changes are flushed when the component unmounts (switching image or
 * language), so nothing typed is lost.
 */
export function useAutosave(
  value: string,
  save: (value: string) => Promise<unknown>,
  delayMs = 600,
) {
  const [state, setState] = useState<SaveState>('idle');
  const saved = useRef(value);
  const latest = useRef(value);
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = latest.current;
    if (next === saved.current) return;
    setState('saving');
    try {
      await saveRef.current(next);
      saved.current = next;
      setState(latest.current === next ? 'saved' : 'saving');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    latest.current = value;
    if (value === saved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delayMs);
  }, [value, delayMs, flush]);

  useEffect(() => () => void flush(), [flush]);

  return { state, flush };
}
