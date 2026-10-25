import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useUpdateNote, useUpdateSource } from '@/data/hooks';
import { isSourceEdited, type SourceTextPatch } from '@/domain/images';
import { languageName } from '@/domain/languages';
import { textStats } from '@/domain/textStats';
import type { ContentItem, LanguageCode, SceneImage } from '@/domain/types';
import { primaryButton, secondaryButton, textButton } from '@/ui/buttons';
import { inputClass } from '@/ui/form';
import { innerCard } from './styles';

/**
 * "Source text" card. Clicking the text (or "Click to edit") corrects it by hand,
 * together with speaker, type and the item's context (SPEC open 2, DECISIONS D30,
 * D40). When the text differs from what OCR read, an "edited" label offers to
 * restore it.
 */
export function SourceTextCard({
  image,
  item,
  sourceLanguage,
}: {
  image: SceneImage;
  item: ContentItem;
  sourceLanguage: LanguageCode;
}) {
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const update = useUpdateSource();
  const { currentUser } = useCurrentUser();
  const { source } = image;
  const edited = isSourceEdited(source);
  const stats = textStats(source.text);
  const meta = [
    source.type,
    item.translatorNote,
    t('editor.characters', { count: stats.characters }),
  ].filter(Boolean);

  const restore = () =>
    update.mutate({
      imageId: image.id,
      patch: { ...source, text: source.ocrText ?? source.text },
      by: currentUser?.id ?? null,
    });

  return (
    <section aria-labelledby={`${image.id}-source`} className={innerCard}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 id={`${image.id}-source`} className="text-base font-semibold text-text">
            {t('editor.sourceText')}
          </h3>
          {edited && (
            <span className="rounded-md bg-fill-subtle px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
              {t('editor.edited')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          {languageName(sourceLanguage, i18n.resolvedLanguage ?? 'en')}
          {!editing && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={t('editor.editSource')}
                className="rounded-sm outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                {t('editor.clickToEdit')}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <SourceForm image={image} item={item} onDone={() => setEditing(false)} />
      ) : image.ocrStatus === 'pending' ? (
        <p className="text-sm text-text-tertiary">{t('editor.readingText')}</p>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="-m-2 flex flex-col gap-3 rounded-lg p-2 text-left outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {source.speaker && (
            <span className="text-sm font-semibold text-accent-text">{source.speaker}</span>
          )}
          {source.text ? (
            <span className="text-lg whitespace-pre-wrap text-text">{source.text}</span>
          ) : (
            <span className="text-sm text-text-tertiary">{t('editor.noSourceText')}</span>
          )}
          <span className="text-sm text-text-secondary">{meta.join(' · ')}</span>
        </button>
      )}

      {edited && !editing && (
        <button
          type="button"
          onClick={restore}
          disabled={update.isPending}
          className={`${textButton} self-start underline`}
        >
          {t('editor.restoreOcr')}
        </button>
      )}
    </section>
  );
}

function SourceForm({
  image,
  item,
  onDone,
}: {
  image: SceneImage;
  item: ContentItem;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateSource();
  const updateNote = useUpdateNote();
  const { currentUser } = useCurrentUser();
  const id = useId();
  const [draft, setDraft] = useState<SourceTextPatch>({
    text: image.source.text,
    speaker: image.source.speaker,
    type: image.source.type,
  });
  const [context, setContext] = useState(item.translatorNote ?? '');
  const field = (key: keyof SourceTextPatch) => ({
    id: `${id}-${key}`,
    value: draft[key] ?? '',
    onChange: (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const by = currentUser?.id ?? null;
    try {
      await update.mutateAsync({ imageId: image.id, patch: draft, by });
      // The context belongs to the item: saved only when it changed.
      if (context.trim() !== (item.translatorNote ?? '')) {
        await updateNote.mutateAsync({ itemId: item.id, note: context, by });
      }
      onDone();
    } catch {
      // The error message below is shown from the mutation state.
    }
  };

  const label = 'text-sm text-text-secondary';
  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      <label htmlFor={`${id}-text`} className={label}>
        {t('editor.text')}
      </label>
      <textarea
        {...field('text')}
        rows={3}
        autoFocus
        className={`${inputClass} h-auto resize-y py-2.5`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-speaker`} className={label}>
            {t('editor.speaker')}
          </label>
          <input {...field('speaker')} autoComplete="off" className={inputClass} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-type`} className={label}>
            {t('editor.type')}
          </label>
          <input {...field('type')} autoComplete="off" className={inputClass} />
        </div>
      </div>
      <label htmlFor={`${id}-context`} className={label}>
        {t('editor.context')}
      </label>
      <input
        id={`${id}-context`}
        value={context}
        onChange={(e) => setContext(e.target.value)}
        autoComplete="off"
        className={inputClass}
      />
      {(update.isError || updateNote.isError) && (
        <p role="alert" className="text-sm text-danger">
          {t('editor.saveError')}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className={secondaryButton}>
          {t('editor.cancel')}
        </button>
        <button
          type="submit"
          disabled={update.isPending || updateNote.isPending}
          className={primaryButton}
        >
          {t('editor.save')}
        </button>
      </div>
    </form>
  );
}
