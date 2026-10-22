import { useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useStoreGlossaryImage } from '@/data/hooks';
import { ACCEPTED_IMAGE_TYPES, checkImageFile } from '@/domain/newContentItem';
import { CloseIcon } from '@/ui/CloseIcon';
import { PlusIcon } from '@/ui/icons';
import { Tag } from '@/ui/Tag';
import { StoredImage } from './Gallery';

const addButton =
  'inline-flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-text outline-none hover:border-text-tertiary focus-visible:ring-2 focus-visible:ring-border-strong';

/** Tags with × and "+ Tag", which turns into a small input (Figma 370:6480). */
export function TagEditor({
  tags,
  onChange,
  labelledBy,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  labelledBy: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const value = draft?.trim();
    if (value && !tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      onChange([...tags, value]);
    }
    setDraft(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
    }
  };

  return (
    <ul aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <li key={tag}>
          <Tag>
            {tag}
            <button
              type="button"
              aria-label={t('glossary.edit.removeTag', { tag })}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="-mr-1 rounded-full text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <CloseIcon className="size-3" />
            </button>
          </Tag>
        </li>
      ))}
      <li>
        {draft === null ? (
          <button type="button" onClick={() => setDraft('')} className={addButton}>
            <PlusIcon className="size-3.5" />
            {t('glossary.edit.addTag')}
          </button>
        ) : (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            aria-label={t('glossary.edit.newTag')}
            autoFocus
            className="h-7 w-36 rounded-full border border-text-tertiary bg-transparent px-3 text-xs text-text outline-none"
          />
        )}
      </li>
    </ul>
  );
}

/** Gallery block of Edit entry: images in order, × to remove, "+ Image" to add. */
export function GalleryEditor({
  fileIds,
  onChange,
  labelledBy,
}: {
  fileIds: string[];
  onChange: (fileIds: string[]) => void;
  labelledBy: string;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const store = useStoreGlossaryImage();
  const [rejected, setRejected] = useState<string[]>([]);

  const add = async (files: FileList) => {
    const refused: string[] = [];
    const added: string[] = [];
    for (const file of files) {
      if (checkImageFile(file)) {
        refused.push(file.name);
        continue;
      }
      added.push(await store.mutateAsync({ name: file.name, data: file }));
    }
    setRejected(refused);
    if (added.length) onChange([...fileIds, ...added]);
  };

  return (
    <div className="flex flex-col gap-2">
      <ul aria-labelledby={labelledBy} className="flex flex-wrap items-end gap-3">
        {fileIds.map((fileId, index) => (
          <li key={fileId} className="group relative">
            <StoredImage
              fileId={fileId}
              alt=""
              className={
                index === 0
                  ? 'h-40 w-auto max-w-64 rounded-md object-contain'
                  : 'size-24 rounded-md object-cover'
              }
            />
            <button
              type="button"
              aria-label={t('glossary.edit.removeImage', { position: index + 1 })}
              onClick={() => onChange(fileIds.filter((id) => id !== fileId))}
              className="absolute -top-2 -right-2 inline-flex size-6 items-center justify-center rounded-full bg-popup text-text opacity-0 ring-2 ring-surface outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={store.isPending}
            className={addButton}
          >
            <PlusIcon className="size-3.5" />
            {t('glossary.edit.addImage')}
          </button>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            data-testid="glossary-image-input"
            className="hidden"
            onChange={(event) => {
              if (event.target.files?.length) void add(event.target.files);
              event.target.value = '';
            }}
          />
        </li>
      </ul>
      {rejected.length > 0 && (
        <p role="alert" className="text-sm text-danger">
          {t('glossary.edit.imageRejected', { names: rejected.join(', ') })}
        </p>
      )}
    </div>
  );
}
