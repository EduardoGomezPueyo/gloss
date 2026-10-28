import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/**
 * The selected entry of an inbox page lives in the URL (`?id=`), so a link opens
 * it again (DECISIONS D43). Without one, or when it left the list, the first entry
 * is shown. ↑/↓ and J/K move through the list from anywhere but a text field;
 * the filters above it keep ←/→.
 */
export function useInboxSelection(ids: string[]) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('id');
  const selectedId = requested && ids.includes(requested) ? requested : (ids[0] ?? null);

  const select = (id: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('id', id);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || ids.length === 0) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable], [role="dialog"], [role="menu"]',
        )
      )
        return;
      const step =
        event.key === 'ArrowDown' || event.key === 'j'
          ? 1
          : event.key === 'ArrowUp' || event.key === 'k'
            ? -1
            : 0;
      if (step === 0) return;
      event.preventDefault();
      // The arrows drive the list only: drop focus from the filter or an entry,
      // so no focus ring lingers on what was last clicked.
      if (target instanceof HTMLElement && target !== document.body) target.blur();
      const index = selectedId ? ids.indexOf(selectedId) : -1;
      const next = ids[Math.min(Math.max(index + step, 0), ids.length - 1)];
      if (next && next !== selectedId) {
        setParams(
          (current) => {
            const updated = new URLSearchParams(current);
            updated.set('id', next);
            return updated;
          },
          { replace: true },
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ids, selectedId, setParams]);

  return { selectedId, select };
}
