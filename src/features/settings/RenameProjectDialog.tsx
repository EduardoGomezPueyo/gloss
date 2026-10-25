import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useRenameProject } from '@/data/hooks';
import type { Project } from '@/domain/types';
import { validateProjectIdentity } from '@/domain/workspaceProjects';
import { primaryButton, secondaryButton } from '@/ui/buttons';
import { Field, inputClass } from '@/ui/form';

/** "Rename project": name and project ID (DECISIONS D42). */
export function RenameProjectDialog({
  project,
  otherCodes,
  onOpenChange,
}: {
  /** The project to rename; null when closed. */
  project: Project | null;
  /** IDs of every other project, deleted ones included. */
  otherCodes: string[];
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={project !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-30 flex w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl outline-none"
        >
          <Dialog.Title className="font-heading text-lg font-bold text-text">
            {t('workspaceProjects.renameTitle')}
          </Dialog.Title>
          {project && (
            <RenameForm
              key={project.id}
              project={project}
              otherCodes={otherCodes}
              onDone={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function RenameForm({
  project,
  otherCodes,
  onDone,
}: {
  project: Project;
  otherCodes: string[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const rename = useRenameProject();
  const id = useId();
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [submitted, setSubmitted] = useState(false);
  const validation = validateProjectIdentity({ name, code }, otherCodes);
  const errors = submitted && !validation.ok ? validation.errors : {};

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    rename.mutate(
      {
        projectId: project.id,
        name: validation.name,
        code: validation.code,
        by: currentUser?.id ?? null,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <Field
        label={t('workspaceProjects.name')}
        htmlFor={`${id}-name`}
        error={errors.name && t(`workspaceProjects.errors.name.${errors.name}`)}
        errorId={`${id}-name-error`}
      >
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          autoComplete="off"
          autoFocus
          className={inputClass}
        />
      </Field>
      <Field
        label={t('workspaceProjects.code')}
        htmlFor={`${id}-code`}
        help={t('workspaceProjects.codeHelp')}
        error={errors.code && t(`workspaceProjects.errors.code.${errors.code}`)}
        errorId={`${id}-code-error`}
      >
        <input
          id={`${id}-code`}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? `${id}-code-error` : undefined}
          autoComplete="off"
          spellCheck={false}
          className={`${inputClass} uppercase`}
        />
      </Field>
      {rename.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('workspaceProjects.saveError')}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className={secondaryButton}>
          {t('editor.cancel')}
        </button>
        <button type="submit" disabled={rename.isPending} className={primaryButton}>
          {t('editor.save')}
        </button>
      </div>
    </form>
  );
}
