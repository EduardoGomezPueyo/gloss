import { Dialog } from 'radix-ui';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCreateSection, useUpdateSection } from '@/data/hooks';
import { validateSection, type SectionInput } from '@/domain/sections';
import type { Id, Section } from '@/domain/types';
import { primaryButton, secondaryButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { Field, inputClass } from '@/ui/form';

export type SectionDialogMode =
  { kind: 'create'; projectId: Id } | { kind: 'edit'; section: Section };

/**
 * "Add section" / "Edit section" modal (no design, DECISIONS D27). Creating offers
 * "Create and add content", which opens the new section to add images right away.
 */
export function SectionDialog({
  mode,
  onOpenChange,
  onCreated,
}: {
  /** null when closed. */
  mode: SectionDialogMode | null;
  onOpenChange: (open: boolean) => void;
  onCreated?: (section: Section, addContent: boolean) => void;
}) {
  return (
    <Dialog.Root open={mode !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-2rem)] w-[540px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl outline-none"
        >
          {/* Remounted on every open, so the form starts from the current values. */}
          {mode && (
            <SectionForm
              mode={mode}
              onDone={(section, addContent) => {
                onOpenChange(false);
                if (mode.kind === 'create') onCreated?.(section, addContent);
              }}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SectionForm({
  mode,
  onDone,
}: {
  mode: SectionDialogMode;
  onDone: (section: Section, addContent: boolean) => void;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const save = mode.kind === 'create' ? createSection : updateSection;
  const id = useId();
  // Which submit button was used; set on click, before the form's submit event.
  const addContent = useRef(false);

  const [draft, setDraft] = useState<SectionInput>(() =>
    mode.kind === 'edit'
      ? { name: mode.section.name, description: mode.section.description }
      : { name: '', description: '' },
  );
  const [submitted, setSubmitted] = useState(false);
  const validation = validateSection(draft);
  const nameError = submitted && !validation.ok;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    const by = currentUser?.id ?? null;
    const done = (section: Section) => onDone(section, addContent.current);
    if (mode.kind === 'create') {
      createSection.mutate(
        { projectId: mode.projectId, input: validation.input, by },
        { onSuccess: done },
      );
    } else {
      updateSection.mutate(
        { id: mode.section.id, input: validation.input, by },
        { onSuccess: done },
      );
    }
  };

  const ids = { name: `${id}-name`, nameError: `${id}-name-error`, description: `${id}-desc` };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 px-8 pt-8 pb-2">
        <div className="flex flex-col gap-3">
          <Dialog.Title className="font-heading text-2xl leading-none font-bold text-text">
            {mode.kind === 'create' ? t('sectionDialog.createTitle') : t('sectionDialog.editTitle')}
          </Dialog.Title>
          <p className="text-base text-text-secondary">{t('sectionDialog.subtitle')}</p>
        </div>
        <Dialog.Close
          aria-label={t('sectionDialog.close')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill-subtle text-text outline-none hover:bg-border-strong focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-col gap-8 overflow-y-auto px-8 pt-6 pb-8">
        <Field
          label={t('sectionDialog.name')}
          htmlFor={ids.name}
          required
          error={nameError ? t('sectionDialog.errors.nameRequired') : undefined}
          errorId={ids.nameError}
        >
          <input
            id={ids.name}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            aria-required
            aria-invalid={nameError || undefined}
            aria-describedby={nameError ? ids.nameError : undefined}
            autoComplete="off"
            className={inputClass}
          />
        </Field>
        <Field
          label={t('sectionDialog.description')}
          htmlFor={ids.description}
          help={t('sectionDialog.descriptionHelp')}
        >
          <textarea
            id={ids.description}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            rows={3}
            className={`${inputClass} h-auto resize-y py-2.5`}
          />
        </Field>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-8 py-6">
        {save.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {t('sectionDialog.saveError')}
          </p>
        )}
        <Dialog.Close type="button" className={secondaryButton}>
          {t('sectionDialog.cancel')}
        </Dialog.Close>
        {mode.kind === 'create' && (
          <button
            type="submit"
            onClick={() => (addContent.current = true)}
            disabled={save.isPending}
            className={secondaryButton}
          >
            {t('sectionDialog.createAndAdd')}
          </button>
        )}
        <button
          type="submit"
          onClick={() => (addContent.current = false)}
          disabled={save.isPending}
          className={primaryButton}
        >
          {save.isPending
            ? t('sectionDialog.saving')
            : mode.kind === 'create'
              ? t('sectionDialog.create')
              : t('sectionDialog.save')}
        </button>
      </footer>
    </form>
  );
}
