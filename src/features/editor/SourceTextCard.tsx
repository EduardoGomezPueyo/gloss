import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useUpdateSource } from '@/data/hooks';
import { isSourceEdited, type SourceTextPatch } from '@/domain/images';
import { languageName } from '@/domain/languages';
import { textStats } from '@/domain/textStats';
import type { LanguageCode, SceneImage } from '@/domain/types';
import { primaryButton, secondaryButton, textButton } from '@/ui/buttons';
import { Card, CardTitle } from '@/ui/Card';
import { inputClass } from '@/ui/form';
import { PencilIcon } from '@/ui/icons';

/**
 * "Source text" card. Clicking the text (or the pencil) corrects it by hand,
 * together with speaker, type and context note (SPEC open 2, DECISIONS D30). When
 * the text differs from what OCR read, an "edited" label offers to restore it.
 */
export function SourceTextCard({
  image,
  sourceLanguage,
}: {
  image: SceneImage;
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
    source.contextNote,
    t('editor.characters', { count: stats.characters }),
  ].filter(Boolean);

  const restore = () =>
    update.mutate({
      imageId: image.id,
      patch: { ...source, text: source.ocrText ?? source.text },
      by: currentUser?.id ?? null,
    });

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CardTitle>{t('editor.sourceText')}</CardTitle>
          {edited && (
            <span className="rounded-md bg-fill-subtle px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
              {t('editor.edited')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          {languageName(sourceLanguage, i18n.resolvedLanguage ?? 'en')}
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t('editor.editSource')}
              title={t('editor.editSource')}
              className="inline-flex size-7 items-center justify-center rounded-md outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
            >
              <PencilIcon />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <SourceForm image={image} onDone={() => setEditing(false)} />
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
    </Card>
  );
}

function SourceForm({ image, onDone }: { image: SceneImage; onDone: () => void }) {
  const { t } = useTranslation();
  const update = useUpdateSource();
  const { currentUser } = useCurrentUser();
  const id = useId();
  const [draft, setDraft] = useState<SourceTextPatch>({
    text: image.source.text,
    speaker: image.source.speaker,
    type: image.source.type,
    contextNote: image.source.contextNote,
  });
  const field = (key: keyof SourceTextPatch) => ({
    id: `${id}-${key}`,
    value: draft[key] ?? '',
    onChange: (e: { target: { value: string } }) =>
      setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate(
      { imageId: image.id, patch: draft, by: currentUser?.id ?? null },
      { onSuccess: onDone },
    );
  };

  const label = 'text-sm text-text-secondary';
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
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
      <label htmlFor={`${id}-contextNote`} className={label}>
        {t('editor.contextNote')}
      </label>
      <input {...field('contextNote')} autoComplete="off" className={inputClass} />
      {update.isError && (
        <p role="alert" className="text-sm text-danger">
          {t('editor.saveError')}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onDone} className={secondaryButton}>
          {t('editor.cancel')}
        </button>
        <button type="submit" disabled={update.isPending} className={primaryButton}>
          {t('editor.save')}
        </button>
      </div>
    </form>
  );
}
