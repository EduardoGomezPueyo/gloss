import { useCallback, useEffect, useRef, useState } from 'react';
import { checkImageFile } from '@/domain/newContentItem';

export interface Upload {
  id: string;
  file: File;
  /** Object URL for thumbnails and the preview; revoked when the modal closes. */
  url: string;
}

/**
 * Images uploaded to the modal and the ordered selection (Figma: Image selector
 * and Image ordering). Nothing is stored until the content item is created.
 */
export function useUploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const add = useCallback((files: Iterable<File>) => {
    const accepted: Upload[] = [];
    const refused: string[] = [];
    for (const file of files) {
      if (checkImageFile(file)) {
        refused.push(file.name);
        continue;
      }
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      accepted.push({ id: crypto.randomUUID(), file, url });
    }
    setRejected(refused);
    setUploads((list) => [...list, ...accepted]);
  }, []);

  /** Click in the selector: adds the image at the end, or takes it out. */
  const toggle = useCallback(
    (id: string) =>
      setSelected((ids) => (ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id])),
    [],
  );

  const remove = useCallback((id: string) => setSelected((ids) => ids.filter((s) => s !== id)), []);

  const byId = (id: string) => uploads.find((u) => u.id === id);
  const ordered = selected.flatMap((id) => byId(id) ?? []);

  return { uploads, selected, ordered, rejected, add, toggle, remove, reorder: setSelected };
}
