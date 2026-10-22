import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCreateCategory } from '@/data/hooks';
import { validateCategoryName } from '@/domain/glossary';
import type { GlossaryCategory } from '@/domain/types';
import { primaryButton, secondaryButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { Field, inputClass } from '@/ui/form';

/** "Create new category" (no design): a small dialog with the name (DECISIONS D31). */
export function CreateCategoryDialog({
  open,
  onOpenChange,
  projectId,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categories: GlossaryCategory[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-30 w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-strong bg-surface p-8 shadow-2xl outline-none"
        >
          {open && (
            <CategoryForm
              projectId={projectId}
              categories={categories}
              onDone={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CategoryForm({
  projectId,
  categories,
  onDone,
}: {
  projectId: string;
  categories: GlossaryCategory[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const create = useCreateCategory();
  const id = useId();
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const validation = validateCategoryName(name, categories);
  const error = submitted && !validation.ok ? validation.error : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    create.mutate(
      { projectId, name: validation.name, by: currentUser?.id ?? null },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <Dialog.Title className="font-heading text-2xl leading-none font-bold text-text">
          {t('glossary.categoryDialog.title')}
        </Dialog.Title>
        <Dialog.Close
          aria-label={t('glossary.categoryDialog.close')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill-subtle text-text outline-none hover:bg-border-strong focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon />
        </Dialog.Close>
      </div>
      <Field
        label={t('glossary.categoryDialog.name')}
        htmlFor={`${id}-name`}
        required
        error={error ? t(`glossary.categoryDialog.errors.${error}`) : undefined}
        errorId={`${id}-error`}
      >
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <div className="flex justify-end gap-3">
        <Dialog.Close type="button" className={secondaryButton}>
          {t('glossary.categoryDialog.cancel')}
        </Dialog.Close>
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          {t('glossary.categoryDialog.create')}
        </button>
      </div>
    </form>
  );
}
