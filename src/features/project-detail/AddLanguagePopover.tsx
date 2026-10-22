import { Popover } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useAddLanguage } from '@/data/hooks';
import { addableTargetLanguages } from '@/domain/languages';
import type { LanguageCode, Project } from '@/domain/types';
import { neutralButton, primaryButton } from '@/ui/buttons';
import { LanguageSelect } from '@/ui/LanguageSelect';

/**
 * "Add language" (no design, DECISIONS D27): a popover with one dropdown of the
 * languages the project does not have yet. The new language starts not started.
 */
export function AddLanguagePopover({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={neutralButton}>{t('projectDetail.addLanguage')}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={8}
          className="z-40 flex w-72 flex-col gap-4 rounded-2xl border border-border-strong bg-popup p-5 shadow-lg outline-none"
        >
          {/* Remounted on every open, so the choice starts empty. */}
          {open && <AddLanguageForm project={project} onDone={() => setOpen(false)} />}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function AddLanguageForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const addLanguage = useAddLanguage();
  const [language, setLanguage] = useState<LanguageCode | null>(null);
  const titleId = useId();
  const addable = addableTargetLanguages(project.sourceLanguage, project.targetLanguages);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!language) return;
    addLanguage.mutate(
      { projectId: project.id, language, by: currentUser?.id ?? null },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} aria-labelledby={titleId} className="flex flex-col gap-4">
      <p id={titleId} className="font-heading text-sm font-semibold text-text">
        {t('projectDetail.addLanguageTitle')}
      </p>
      {addable.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('projectDetail.allLanguagesAdded')}</p>
      ) : (
        <>
          <LanguageSelect
            value={language}
            onChange={setLanguage}
            options={addable}
            label={t('projectDetail.language')}
          />
          {addLanguage.isError && (
            <p role="alert" className="text-sm text-danger">
              {t('projectDetail.addLanguageError')}
            </p>
          )}
          <button
            type="submit"
            disabled={!language || addLanguage.isPending}
            className={`${primaryButton} self-end`}
          >
            {t('projectDetail.add')}
          </button>
        </>
      )}
    </form>
  );
}
