import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCEPTED_IMAGE_TYPES } from '@/domain/newContentItem';
import { PlusIcon } from '@/ui/icons';
import type { Upload } from './useUploads';

/**
 * "Image selector" column (Figma 370:11733): drop images or browse with +, then
 * click a thumbnail to add it to the item (or click again to take it out).
 */
export function ImageSelector({
  uploads,
  selected,
  onAdd,
  onToggle,
  onPreview,
}: {
  uploads: Upload[];
  selected: string[];
  onAdd: (files: FileList) => void;
  onToggle: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) onAdd(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex min-h-0 w-full flex-col gap-6 rounded-lg ${dragging ? 'bg-fill-subtle' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-[13px] font-semibold text-text">{t('addContent.selectorTitle')}</h3>
          <p className="text-[13px] text-text-secondary">{t('addContent.selectorHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-label={t('addContent.browse')}
          title={t('addContent.browse')}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <PlusIcon className="size-3" />
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          data-testid="image-file-input"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) onAdd(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-0.5">
        {uploads.map((upload) => {
          const position = selected.indexOf(upload.id) + 1;
          return (
            <li key={upload.id} className="relative" onMouseEnter={() => onPreview(upload.id)}>
              <button
                type="button"
                aria-pressed={position > 0}
                aria-label={t('addContent.addImage', { name: upload.file.name })}
                onClick={() => onToggle(upload.id)}
                onFocus={() => onPreview(upload.id)}
                className={`block w-full overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
                  position > 0 ? 'ring-2 ring-accent' : ''
                }`}
              >
                <img src={upload.url} alt="" className="aspect-[186/130] w-full object-cover" />
              </button>
              {position > 0 && (
                <span
                  aria-hidden
                  className="absolute right-1.5 bottom-1.5 inline-flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground"
                >
                  {position}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
