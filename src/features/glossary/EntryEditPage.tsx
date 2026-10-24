import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import {
  useGlossary,
  useGlossaryEntry,
  useGlossaryVersions,
  useMembers,
  useSaveGlossaryEntry,
} from '@/data/hooks';
import {
  MAX_DESCRIPTION_LENGTH,
  validateGlossaryEntry,
  type GlossaryDraft,
  type GlossaryError,
} from '@/domain/glossary';
import type { GlossaryCategory, GlossaryEntry } from '@/domain/types';
import { largeTextButton, pageButton } from '@/ui/buttons';
import { Field, inputClass, SelectInput } from '@/ui/form';

/** The fields the design does not show (D31) are kept compact. */
const compactInput = inputClass.replace('h-[42px]', 'h-9').replace('text-base', 'text-sm');
import { PageMessage } from '../project-detail/shared';
import { GalleryEditor, TagEditor } from './EntryFields';
import { glossaryPaths } from './format';
import { MarkdownEditor } from './MarkdownEditor';
import { VersionHistory } from './VersionHistory';

/**
 * "Edit entry - <name>" (Figma 370:6480) and "New entry". Save changes stores a
 * version; Discard changes asks first when something changed (DECISIONS D31).
 */
export function EntryEditPage() {
  const { t } = useTranslation();
  const { projectId = '', entryId } = useParams();
  const glossary = useGlossary(projectId);
  const entry = useGlossaryEntry(entryId ?? '');

  if (glossary.isPending || (entryId && entry.isPending)) {
    return <p className="text-sm text-text-tertiary">{t('glossary.loading')}</p>;
  }
  if (glossary.isError || entry.isError) {
    return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  }
  if (entryId && (!entry.data || entry.data.projectId !== projectId)) {
    return <PageMessage>{t('glossary.entry.notFound')}</PageMessage>;
  }
  return (
    <EntryForm
      // Keyed by entry only: saving changes updatedAt and must not reset the form.
      key={entryId ?? 'new'}
      projectId={projectId}
      entry={entryId ? entry.data! : null}
      categories={glossary.data.categories}
      titles={glossary.data.entries.filter((e) => e.id !== entryId).map((e) => e.title)}
    />
  );
}

function EntryForm({
  projectId,
  entry,
  categories,
  titles,
}: {
  projectId: string;
  entry: GlossaryEntry | null;
  categories: GlossaryCategory[];
  titles: string[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser } = useCurrentUser();
  const { data: members = [] } = useMembers();
  const versions = useGlossaryVersions(entry?.id ?? null);
  const save = useSaveGlossaryEntry();
  const id = useId();

  const [initial] = useState<GlossaryDraft>(() =>
    entry
      ? {
          categoryId: entry.categoryId,
          title: entry.title,
          description: entry.description,
          tags: entry.tags,
          imageFileIds: entry.imageFileIds,
          body: entry.body,
        }
      : {
          categoryId: params.get('category') ?? categories[0]?.id ?? null,
          title: '',
          description: '',
          tags: [],
          imageFileIds: [],
          body: '',
        },
  );
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const update = (patch: Partial<GlossaryDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const validation = validateGlossaryEntry(draft);
  const errors: GlossaryError[] = submitted && !validation.ok ? validation.errors : [];
  const errorText = (error: GlossaryError) =>
    errors.includes(error)
      ? t(`glossary.edit.errors.${error}`, { max: MAX_DESCRIPTION_LENGTH })
      : undefined;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const leaveTo = entry
    ? glossaryPaths.entry(projectId, entry.id)
    : glossaryPaths.overview(projectId);

  const discard = () => {
    if (dirty && !window.confirm(t('glossary.edit.discardConfirm'))) return;
    void navigate(leaveTo);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    save.mutate(
      {
        projectId,
        entryId: entry?.id ?? null,
        content: validation.content,
        by: currentUser?.id ?? null,
      },
      { onSuccess: (saved) => void navigate(glossaryPaths.entry(projectId, saved.id)) },
    );
  };

  const ids = {
    title: `${id}-title`,
    titleError: `${id}-title-error`,
    description: `${id}-description`,
    descriptionError: `${id}-description-error`,
    descriptionHelp: `${id}-description-help`,
    category: `${id}-category`,
    tags: `${id}-tags`,
    images: `${id}-images`,
    body: `${id}-body`,
    bodyHelp: `${id}-body-help`,
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-2xl leading-7 font-bold text-text">
          {entry
            ? t('glossary.edit.editTitle', { title: entry.title })
            : t('glossary.edit.newTitle')}
        </h1>
        <div className="flex items-center gap-1">
          {save.isError && (
            <p role="alert" className="text-sm text-danger">
              {t('glossary.edit.saveError')}
            </p>
          )}
          <button type="button" onClick={discard} className={`${largeTextButton} px-3 py-1`}>
            {t('glossary.edit.discard')}
          </button>
          <button type="submit" disabled={save.isPending} className={pageButton}>
            {save.isPending ? t('glossary.edit.saving') : t('glossary.edit.save')}
          </button>
        </div>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_254px]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor={ids.title} className="sr-only">
              {t('glossary.edit.title')}
            </label>
            <div className="flex items-baseline gap-2 font-heading text-xl leading-7 font-bold text-text">
              <span aria-hidden className="text-text-tertiary">
                #
              </span>
              <input
                id={ids.title}
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={t('glossary.edit.title')}
                aria-invalid={errors.includes('titleRequired') || undefined}
                aria-describedby={errors.includes('titleRequired') ? ids.titleError : undefined}
                autoComplete="off"
                className="w-full rounded-md bg-transparent outline-none placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-border-strong"
              />
            </div>
            {errors.includes('titleRequired') && (
              <p id={ids.titleError} className="text-sm text-danger">
                {errorText('titleRequired')}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <Field
              label={t('glossary.edit.description')}
              htmlFor={ids.description}
              required
              help={t('glossary.edit.descriptionHelp', { max: MAX_DESCRIPTION_LENGTH })}
              error={errorText('descriptionRequired') ?? errorText('descriptionTooLong')}
              errorId={ids.descriptionError}
            >
              <input
                id={ids.description}
                value={draft.description}
                onChange={(e) => update({ description: e.target.value })}
                aria-invalid={
                  errors.includes('descriptionRequired') ||
                  errors.includes('descriptionTooLong') ||
                  undefined
                }
                aria-describedby={ids.descriptionError}
                autoComplete="off"
                className={compactInput}
              />
            </Field>
            <Field
              label={t('glossary.edit.category')}
              htmlFor={ids.category}
              required
              error={errorText('categoryRequired')}
            >
              <SelectInput
                id={ids.category}
                value={draft.categoryId}
                onChange={(categoryId) => update({ categoryId })}
                placeholder={t('glossary.edit.categoryPlaceholder')}
                invalid={errors.includes('categoryRequired')}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <span id={ids.tags} className="text-[13px] text-text">
              {t('glossary.edit.tags')}
            </span>
            <TagEditor
              tags={draft.tags}
              onChange={(tags) => update({ tags })}
              labelledBy={ids.tags}
            />
          </div>

          <div className="flex flex-col gap-3">
            <span id={ids.images} className="text-[13px] text-text">
              {t('glossary.edit.images')}
            </span>
            <GalleryEditor
              fileIds={draft.imageFileIds}
              onChange={(imageFileIds) => update({ imageFileIds })}
              labelledBy={ids.images}
            />
          </div>

          <div className="flex flex-col gap-3">
            <span id={ids.body} className="text-[13px] text-text">
              {t('glossary.edit.body')}
            </span>
            <p id={ids.bodyHelp} className="-mt-1 text-[13px] text-text-secondary">
              {t('glossary.edit.bodyHelp')}
            </p>
            <MarkdownEditor
              value={draft.body}
              onChange={(body) => update({ body })}
              titles={titles}
              labelledBy={ids.body}
              describedBy={ids.bodyHelp}
              placeholder={t('glossary.edit.bodyPlaceholder')}
            />
          </div>
        </div>

        {entry && (
          <aside>
            <VersionHistory
              projectId={projectId}
              entryId={entry.id}
              versions={versions.data ?? []}
              members={members}
            />
          </aside>
        )}
      </div>
    </form>
  );
}
