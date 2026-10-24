import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useOcrQueue } from '@/app/ocr/useOcrQueue';
import { useCreateContentItem } from '@/data/hooks';
import {
  suggestedItemTypes,
  validateNewContentItem,
  type NewContentItemError,
  type NewContentItemInput,
} from '@/domain/newContentItem';
import type { Id } from '@/domain/types';
import { accentButton, secondaryButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { Field, inputClass } from '@/ui/form';
import { ImageOrdering } from './ImageOrdering';
import { ImageSelector } from './ImageSelector';
import { useUploads } from './useUploads';

const compactInput = inputClass.replace('h-[42px]', 'h-9').replace('text-base', 'text-sm');

/**
 * "Add content to section" modal (Figma 370:11493 / 11733 / 11978). Not in the
 * design (DECISIONS D29): the name and type row, the footer, and OCR, which runs
 * after the item is created.
 */
export function AddContentDialog({
  open,
  onOpenChange,
  sectionId,
  existingTypes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: Id;
  /** Item types already used in the project, offered as suggestions. */
  existingTypes: string[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-30 flex h-[min(720px,calc(100dvh-2rem))] w-[1000px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border-strong bg-card shadow-2xl outline-none"
        >
          {/* Remounted on every open, so uploads start empty and their URLs are released. */}
          {open && (
            <AddContentForm
              sectionId={sectionId}
              existingTypes={existingTypes}
              onDone={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AddContentForm({
  sectionId,
  existingTypes,
  onDone,
}: {
  sectionId: Id;
  existingTypes: string[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const ocrQueue = useOcrQueue();
  const createItem = useCreateContentItem();
  const uploads = useUploads();
  const id = useId();
  const [draft, setDraft] = useState<NewContentItemInput>({ name: '', type: '' });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const validation = validateNewContentItem(draft, uploads.ordered.length);
  const errors: NewContentItemError[] = submitted && !validation.ok ? validation.errors : [];
  const preview =
    uploads.uploads.find((u) => u.id === previewId) ?? uploads.ordered[0] ?? uploads.uploads[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    createItem.mutate(
      {
        sectionId,
        input: validation.input,
        images: uploads.ordered.map(({ file }) => ({ name: file.name, data: file })),
        by: currentUser?.id ?? null,
      },
      {
        onSuccess: () => {
          ocrQueue.run();
          onDone();
        },
      },
    );
  };

  const ids = {
    name: `${id}-name`,
    nameError: `${id}-name-error`,
    type: `${id}-type`,
    types: `${id}-types`,
    ordering: `${id}-ordering`,
    preview: `${id}-preview`,
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-4 bg-surface px-6">
        <Dialog.Title className="text-[13px] font-semibold text-text">
          {t('addContent.title')}
        </Dialog.Title>
        <Dialog.Close
          aria-label={t('addContent.close')}
          className="-mr-1 inline-flex size-6 items-center justify-center rounded-md text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon className="size-4" />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-6 pt-4">
        {/* The name and type row is not in the design (D29); compact so the images keep their room. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('addContent.name')}
            htmlFor={ids.name}
            required
            error={
              errors.includes('nameRequired') ? t('addContent.errors.nameRequired') : undefined
            }
            errorId={ids.nameError}
          >
            <input
              id={ids.name}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              aria-required
              aria-invalid={errors.includes('nameRequired') || undefined}
              aria-describedby={errors.includes('nameRequired') ? ids.nameError : undefined}
              autoComplete="off"
              className={compactInput}
            />
          </Field>
          <Field label={t('addContent.type')} htmlFor={ids.type}>
            <input
              id={ids.type}
              list={ids.types}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              placeholder={t('addContent.typePlaceholder')}
              autoComplete="off"
              className={compactInput}
            />
            <datalist id={ids.types}>
              {suggestedItemTypes(existingTypes).map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </Field>
        </div>

        <section aria-labelledby={ids.ordering} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 id={ids.ordering} className="text-[13px] font-semibold text-text">
              {t('addContent.orderingTitle')}
            </h3>
            <p className="text-[11px] text-text-secondary">{t('addContent.orderingHint')}</p>
          </div>
          <ImageOrdering
            images={uploads.ordered}
            onReorder={uploads.reorder}
            onRemove={uploads.remove}
            onPreview={setPreviewId}
          />
        </section>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_202px] pb-4">
          <section aria-labelledby={ids.preview} className="flex min-h-0 flex-col gap-6 pr-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id={ids.preview} className="text-[13px] font-semibold text-text">
                {t('addContent.previewTitle')}
              </h3>
              <p className="text-[11px] text-text-secondary">{t('addContent.previewHint')}</p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {preview ? (
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  className="max-h-full max-w-full rounded-md object-contain"
                />
              ) : (
                <p className="text-sm text-text-tertiary">{t('addContent.previewEmpty')}</p>
              )}
            </div>
          </section>
          <div className="flex min-h-0 border-l border-border-strong pl-4">
            <ImageSelector
              uploads={uploads.uploads}
              selected={uploads.selected}
              onAdd={uploads.add}
              onToggle={uploads.toggle}
              onPreview={setPreviewId}
            />
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border-strong px-6 py-3">
        <div className="mr-auto flex flex-col gap-1 text-[13px]">
          {uploads.rejected.length > 0 && (
            <p role="alert" className="text-danger">
              {t('addContent.rejected', { names: uploads.rejected.join(', ') })}
            </p>
          )}
          {errors.includes('imagesRequired') && (
            <p role="alert" className="text-danger">
              {t('addContent.errors.imagesRequired')}
            </p>
          )}
          {createItem.isError && (
            <p role="alert" className="text-danger">
              {t('addContent.saveError')}
            </p>
          )}
          <p className="text-text-secondary" aria-live="polite">
            {uploads.ordered.length > 0
              ? t('addContent.selectedCount', { count: uploads.ordered.length })
              : t('addContent.ocrNote')}
          </p>
        </div>
        <Dialog.Close type="button" className={secondaryButton}>
          {t('addContent.cancel')}
        </Dialog.Close>
        <button type="submit" disabled={createItem.isPending} className={accentButton}>
          {createItem.isPending ? t('addContent.creating') : t('addContent.create')}
        </button>
      </footer>
    </form>
  );
}
