import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useUpdateNote } from '@/data/hooks';
import type { ContentItem } from '@/domain/types';
import { primaryButton, secondaryButton, textButton } from '@/ui/buttons';
import { inputClass } from '@/ui/form';
import { PencilIcon } from '@/ui/icons';

/** "Note for translators" under the editor (SPEC 5.4). Managers can write or change it. */
export function TranslatorNote({ item }: { item: ContentItem }) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const update = useUpdateNote();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const isManager = currentUser?.category === 'manager';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { itemId: item.id, note: draft, by: currentUser?.id ?? null },
      { onSuccess: () => setDraft(null) },
    );
  };

  if (draft !== null) {
    return (
      <form onSubmit={submit} className="flex flex-col gap-3 px-1">
        <label htmlFor={id} className="text-sm text-text-secondary">
          {t('editor.translatorNote')}
        </label>
        <textarea
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className={`${inputClass} h-auto resize-y py-2.5`}
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setDraft(null)} className={secondaryButton}>
            {t('editor.cancel')}
          </button>
          <button type="submit" disabled={update.isPending} className={primaryButton}>
            {t('editor.save')}
          </button>
        </div>
      </form>
    );
  }

  if (!item.translatorNote) {
    return isManager ? (
      <button
        type="button"
        onClick={() => setDraft('')}
        className={`${textButton} self-start px-1`}
      >
        <PencilIcon />
        {t('editor.addNote')}
      </button>
    ) : null;
  }

  return (
    <aside aria-label={t('editor.translatorNote')} className="flex items-start gap-3 px-1">
      <InfoIcon />
      <p className="flex-1 text-sm whitespace-pre-wrap text-text-secondary">
        {item.translatorNote}
      </p>
      {isManager && (
        <button
          type="button"
          onClick={() => setDraft(item.translatorNote ?? '')}
          aria-label={t('editor.editNote')}
          title={t('editor.editNote')}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <PencilIcon />
        </button>
      )}
    </aside>
  );
}

function InfoIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="mt-0.5 size-4 shrink-0 text-text-secondary"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v3.6M8 5.2v.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
