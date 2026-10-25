import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { useItemImages, useMembers, useProjectDetail } from '@/data/hooks';
import type { Id, LanguageCode } from '@/domain/types';
import { CardTitle } from '@/ui/Card';
import { PageMessage } from '../project-detail/shared';
import { CommentsPanel } from './CommentsPanel';
import { CommentsSummary } from './CommentsSummary';
import { EditorGlossaryCard } from './EditorGlossaryCard';
import { EditorHeader } from './EditorHeader';
import { LanguagePicker } from './LanguagePicker';
import { ImagePager, SourceImage } from './SourceImage';
import { SourceTextCard } from './SourceTextCard';
import { TranslationEditor } from './TranslationEditor';
import type { SaveState } from './useAutosave';

/**
 * "Translation workspace" (SPEC 5.4, redesigned in DECISIONS D40): the image and
 * its comments on the left; the source text, the editor for one language and the
 * glossary on the right. The current image and language live in the URL
 * (?image=2&lang=es) so they can be linked.
 */
export function EditorPage() {
  const { t } = useTranslation();
  const { projectId = '', itemId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const detail = useProjectDetail(projectId);
  const itemImages = useItemImages(itemId);
  const { data: members = [] } = useMembers();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  // The comments side bar: closed (null), or open, on one thread or none.
  const [commentsPanel, setCommentsPanel] = useState<{ threadId: Id | null } | null>(null);
  const headingId = useId();

  if (detail.isPending || itemImages.isPending) {
    return <p className="text-sm text-text-tertiary">{t('editor.loading')}</p>;
  }
  if (detail.isError || itemImages.isError) {
    return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  }
  const section = detail.data?.sections.find((s) => s.items.some((i) => i.item.id === itemId));
  const itemSummary = section?.items.find((i) => i.item.id === itemId);
  if (!detail.data || !section || !itemSummary) {
    return <PageMessage>{t('editor.notFound')}</PageMessage>;
  }

  const { project } = detail.data;
  const { images, translations } = itemImages.data;
  const languages = project.targetLanguages;
  const position = Math.min(Math.max(Number(params.get('image')) || 1, 1), images.length || 1);
  const image = images[position - 1];
  const paramLanguage = params.get('lang');
  const language: LanguageCode | undefined =
    paramLanguage && languages.includes(paramLanguage) ? paramLanguage : languages[0];

  const navigate = (next: { image?: number; lang?: LanguageCode }) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next.image !== undefined) updated.set('image', String(next.image));
        if (next.lang !== undefined) updated.set('lang', next.lang);
        return updated;
      },
      { replace: true },
    );

  const projectPeople = members.filter(
    (m) => project.managerIds.includes(m.id) || project.memberIds.includes(m.id),
  );

  const translationOf = (lang: LanguageCode) =>
    image ? translations.find((t) => t.imageId === image.id && t.language === lang) : undefined;

  return (
    <>
      <EditorHeader
        summary={detail.data}
        section={section.section}
        item={itemSummary.item}
        saveState={saveState}
      />

      <section
        aria-labelledby={headingId}
        className="flex grow flex-col gap-4 rounded-2xl bg-card p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <CardTitle id={headingId}>{t('editor.sourceImage')}</CardTitle>
          <ImagePager
            position={position}
            total={images.length}
            onSelect={(next) => navigate({ image: next })}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <div className="flex flex-col gap-4">
            <SourceImage image={image} />
            {image && (
              <CommentsSummary
                // Keyed by image so a half-written comment never moves to another image.
                key={image.id}
                imageId={image.id}
                languages={languages}
                defaultLanguage={language ?? null}
                members={projectPeople}
                allMembers={members}
                onViewAll={(threadId) => setCommentsPanel({ threadId: threadId ?? null })}
              />
            )}
          </div>

          <div className="flex flex-col gap-4">
            {image && (
              // Keyed by image so an open edit form never carries over to another image.
              <SourceTextCard
                key={image.id}
                image={image}
                item={itemSummary.item}
                sourceLanguage={project.sourceLanguage}
              />
            )}
            {image && language ? (
              <TranslationEditor
                // A new editor per image and language: drafts never leak between them.
                key={`${image.id}-${language}`}
                image={image}
                language={language}
                languagePicker={
                  <LanguagePicker
                    languages={languages}
                    images={images}
                    translations={translations}
                    selected={language}
                    onSelect={(lang) => navigate({ lang })}
                  />
                }
                translation={translationOf(language)}
                members={members}
                onSaveStateChange={setSaveState}
              />
            ) : (
              !language && <p className="text-sm text-text-tertiary">{t('editor.noLanguages')}</p>
            )}
            <EditorGlossaryCard
              projectId={project.id}
              texts={[image?.source.text ?? '', (language && translationOf(language)?.text) || '']}
            />
          </div>
        </div>
      </section>

      {image && (
        <CommentsPanel
          open={commentsPanel !== null}
          onOpenChange={(open) => setCommentsPanel(open ? { threadId: null } : null)}
          focusThreadId={commentsPanel?.threadId ?? null}
          imageId={image.id}
          languages={languages}
          defaultLanguage={language ?? null}
          members={projectPeople}
          allMembers={members}
        />
      )}
    </>
  );
}
