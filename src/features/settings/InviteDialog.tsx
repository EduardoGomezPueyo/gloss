import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useInviteMembers } from '@/data/hooks';
import { validateInvites, type InviteError, type InviteRow } from '@/domain/members';
import type { Member, MemberCategory } from '@/domain/types';
import { primaryButton, secondaryButton, textButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { inputClass, SelectInput } from '@/ui/form';
import { PlusIcon } from '@/ui/icons';

const emptyRow = (): InviteRow => ({ name: '', email: '', category: 'worker' });

/**
 * "Invite members to workspace" (no design, DECISIONS D32): one row per person
 * with name, email and category. They join as Invited; no email is sent.
 */
export function InviteDialog({
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
        <Dialog.Content className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-2rem)] w-[720px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl outline-none">
          {open && <InviteForm members={members} onDone={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function InviteForm({ members, onDone }: { members: Member[]; onDone: () => void }) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const invite = useInviteMembers();
  const id = useId();
  const [rows, setRows] = useState<InviteRow[]>([emptyRow()]);
  const [submitted, setSubmitted] = useState(false);

  const validation = validateInvites(rows, members);
  const errorsOf = (index: number): InviteError[] =>
    submitted && !validation.ok ? (validation.errors[index] ?? []) : [];
  const update = (index: number, patch: Partial<InviteRow>) =>
    setRows((list) => list.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    invite.mutate({ rows: validation.rows, by: currentUser?.id ?? null }, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 px-8 pt-8 pb-2">
        <div className="flex flex-col gap-3">
          <Dialog.Title className="font-heading text-2xl leading-none font-bold text-text">
            {t('members.inviteDialog.title')}
          </Dialog.Title>
          <Dialog.Description className="text-base text-text-secondary">
            {t('members.inviteDialog.subtitle')}
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label={t('members.inviteDialog.close')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill-subtle text-text outline-none hover:bg-border-strong focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-8 pt-6 pb-8">
        {rows.map((row, index) => {
          const errors = errorsOf(index);
          const number = index + 1;
          const fieldId = (name: string) => `${id}-${index}-${name}`;
          const errorId = fieldId('errors');
          return (
            <fieldset key={index} className="flex flex-col gap-2">
              <legend className="sr-only">{t('members.inviteDialog.person', { number })}</legend>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_9rem_2rem] items-end gap-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor={fieldId('name')} className="text-sm text-text">
                    {t('members.inviteDialog.name')}
                  </label>
                  <input
                    id={fieldId('name')}
                    value={row.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                    aria-invalid={errors.includes('nameRequired') || undefined}
                    aria-describedby={errors.length ? errorId : undefined}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor={fieldId('email')} className="text-sm text-text">
                    {t('members.inviteDialog.email')}
                  </label>
                  <input
                    id={fieldId('email')}
                    type="email"
                    value={row.email}
                    onChange={(e) => update(index, { email: e.target.value })}
                    aria-invalid={errors.some((e) => e.startsWith('email')) || undefined}
                    aria-describedby={errors.length ? errorId : undefined}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor={fieldId('category')} className="text-sm text-text">
                    {t('members.inviteDialog.category')}
                  </label>
                  <SelectInput
                    id={fieldId('category')}
                    value={row.category}
                    onChange={(value) => update(index, { category: value as MemberCategory })}
                    options={(['worker', 'manager'] as const).map((c) => ({
                      value: c,
                      label: t(`memberCategory.${c}`),
                    }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((list) => list.filter((_, i) => i !== index))}
                  disabled={rows.length === 1}
                  aria-label={t('members.inviteDialog.removeRow', { number })}
                  className="mb-2 inline-flex size-8 items-center justify-center rounded-lg text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong disabled:opacity-30"
                >
                  <CloseIcon />
                </button>
              </div>
              {errors.length > 0 && (
                <p id={errorId} className="text-sm text-danger">
                  {errors.map((e) => t(`members.inviteDialog.errors.${e}`)).join(' ')}
                </p>
              )}
            </fieldset>
          );
        })}
        <button
          type="button"
          onClick={() => setRows((list) => [...list, emptyRow()])}
          className={`${textButton} self-start`}
        >
          <PlusIcon />
          {t('members.inviteDialog.addAnother')}
        </button>
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-8 py-6">
        {invite.isError && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {t('members.inviteDialog.saveError')}
          </p>
        )}
        <Dialog.Close type="button" className={secondaryButton}>
          {t('members.inviteDialog.cancel')}
        </Dialog.Close>
        <button type="submit" disabled={invite.isPending} className={primaryButton}>
          {invite.isPending ? t('members.inviteDialog.sending') : t('members.inviteDialog.send')}
        </button>
      </footer>
    </form>
  );
}
