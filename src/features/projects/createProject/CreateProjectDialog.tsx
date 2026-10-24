import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useCreateProject } from '@/data/hooks';
import { LANGUAGES, languageName, withoutSource } from '@/domain/languages';
import {
  EMPTY_PROJECT_DRAFT,
  validateNewProject,
  type NewProjectDraft,
  type NewProjectError,
} from '@/domain/newProject';
import { PLATFORMS, type Member } from '@/domain/types';
import { primaryButton, secondaryButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { Field, inputClass } from '@/ui/form';
import { LanguageFlag } from '@/ui/LanguageFlag';
import { LanguageSelect } from '@/ui/LanguageSelect';
import { PlatformDot } from '@/ui/PlatformChip';
import { PeoplePicker, PriorityPicker, ToggleChip } from './fields';

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * "Add new project" modal (Figma 370:5450 + DECISIONS D8). The current user is
 * proposed as manager when they are one. Errors appear after the first submit.
 */
export function CreateProjectDialog({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-2rem)] w-[920px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl outline-none"
        >
          {/* Remounted on every open, so the form always starts empty. */}
          {open && <CreateProjectForm members={members} onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CreateProjectForm({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const { currentUser } = useCurrentUser();
  const createProject = useCreateProject();
  const id = useId();

  const [draft, setDraft] = useState<NewProjectDraft>(() => ({
    ...EMPTY_PROJECT_DRAFT,
    managerIds: currentUser?.category === 'manager' ? [currentUser.id] : [],
  }));
  const [submitted, setSubmitted] = useState(false);

  const validation = validateNewProject(draft);
  const errors: NewProjectError[] = submitted && !validation.ok ? validation.errors : [];
  const errorFor = (error: NewProjectError) =>
    errors.includes(error) ? t(`createProject.errors.${error}`) : undefined;

  const update = (patch: Partial<NewProjectDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const managers = members.filter((m) => m.category === 'manager');
  const workers = members.filter((m) => m.category === 'worker');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    createProject.mutate(
      { input: validation.input, by: currentUser?.id ?? null },
      { onSuccess: onDone },
    );
  };

  const ids = {
    name: `${id}-name`,
    nameError: `${id}-name-error`,
    managersError: `${id}-managers-error`,
    source: `${id}-source`,
    sourceError: `${id}-source-error`,
    priority: `${id}-priority`,
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 px-8 pt-8 pb-2">
        <div className="flex flex-col gap-3">
          <Dialog.Title className="font-heading text-2xl leading-none font-bold text-text">
            {t('createProject.title')}
          </Dialog.Title>
          <p className="text-base text-text-secondary">{t('createProject.subtitle')}</p>
        </div>
        <Dialog.Close
          aria-label={t('createProject.close')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill-subtle text-text outline-none hover:bg-border-strong focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-8 pt-6 pb-8">
        <Field
          label={t('createProject.name')}
          htmlFor={ids.name}
          required
          error={errorFor('nameRequired')}
          errorId={ids.nameError}
        >
          <input
            id={ids.name}
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            aria-required
            aria-invalid={errors.includes('nameRequired') || undefined}
            aria-describedby={errors.includes('nameRequired') ? ids.nameError : undefined}
            autoComplete="off"
            className={inputClass}
          />
        </Field>

        {/* Two columns so the form fits without scrolling (DECISIONS D39). */}
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">
            <Field label={t('createProject.platforms')} help={t('createProject.platformsHelp')}>
              <div className="flex flex-wrap gap-3">
                {PLATFORMS.map((platform) => (
                  <ToggleChip
                    key={platform}
                    pressed={draft.platforms.includes(platform)}
                    onToggle={() => update({ platforms: toggle(draft.platforms, platform) })}
                  >
                    <PlatformDot platform={platform} />
                    {t(`platform.${platform}`)}
                  </ToggleChip>
                ))}
              </div>
            </Field>

            <Field
              label={t('createProject.sourceLanguage')}
              htmlFor={ids.source}
              required
              error={errorFor('sourceLanguageRequired')}
              errorId={ids.sourceError}
            >
              <LanguageSelect
                id={ids.source}
                value={draft.sourceLanguage}
                onChange={(sourceLanguage) =>
                  update({
                    sourceLanguage,
                    targetLanguages: withoutSource(draft.targetLanguages, sourceLanguage),
                  })
                }
                invalid={errors.includes('sourceLanguageRequired')}
                describedBy={
                  errors.includes('sourceLanguageRequired') ? ids.sourceError : undefined
                }
              />
            </Field>

            <div className="flex flex-col gap-3">
              <span id={ids.priority} className="text-sm text-text">
                {t('createProject.priority')}
              </span>
              <PriorityPicker
                labelId={ids.priority}
                value={draft.priority}
                onChange={(priority) => update({ priority })}
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <Field
              label={t('createProject.managers')}
              required
              aside={t('createProject.added', { count: draft.managerIds.length })}
              error={errorFor('managerRequired')}
              errorId={ids.managersError}
            >
              <PeoplePicker
                addLabel={t('createProject.addManagers')}
                options={managers}
                selected={draft.managerIds}
                onChange={(managerIds) => update({ managerIds })}
                invalid={errors.includes('managerRequired')}
                describedBy={errors.includes('managerRequired') ? ids.managersError : undefined}
              />
            </Field>

            <Field
              label={t('createProject.teamMembers')}
              aside={t('createProject.added', { count: draft.memberIds.length })}
            >
              <PeoplePicker
                addLabel={t('createProject.addTeamMembers')}
                options={workers}
                selected={draft.memberIds}
                onChange={(memberIds) => update({ memberIds })}
              />
            </Field>
          </div>
        </div>

        <Field
          label={t('createProject.targetLanguages')}
          help={t('createProject.targetLanguagesHelp')}
        >
          <div className="flex flex-wrap gap-3">
            {LANGUAGES.filter(({ code }) => code !== draft.sourceLanguage).map(({ code }) => (
              <ToggleChip
                key={code}
                pressed={draft.targetLanguages.includes(code)}
                onToggle={() => update({ targetLanguages: toggle(draft.targetLanguages, code) })}
              >
                <LanguageFlag code={code} />
                {languageName(code, locale)}
              </ToggleChip>
            ))}
          </div>
        </Field>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-border px-8 py-6">
        <span className="text-sm text-text-secondary">
          <span aria-hidden>* </span>
          {t('createProject.required')}
        </span>
        <div className="flex items-center gap-3">
          {createProject.isError && (
            <p role="alert" className="text-sm text-danger">
              {t('createProject.saveError')}
            </p>
          )}
          <Dialog.Close type="button" className={secondaryButton}>
            {t('createProject.cancel')}
          </Dialog.Close>
          <button type="submit" disabled={createProject.isPending} className={primaryButton}>
            {createProject.isPending ? t('createProject.submitting') : t('createProject.submit')}
          </button>
        </div>
      </footer>
    </form>
  );
}
