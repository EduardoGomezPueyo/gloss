import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { useItemImages, useMembers, useProjectDetail } from '@/data/hooks';
import type { LanguageCode } from '@/domain/types';
import { PageMessage } from '../project-detail/shared';
import { CommentsCard } from './CommentsCard';
import { ComparisonCard } from './ComparisonCard';
import { EditorGlossaryCard } from './EditorGlossaryCard';
import { EditorHeader } from './EditorHeader';
import { ImageStrip } from './ImageStrip';
import { LanguageCards } from './LanguageCards';
import { SourceImageCard } from './SourceImageCard';
import { SourceTextCard } from './SourceTextCard';
import { TranslationEditor } from './TranslationEditor';
import { TranslatorNote } from './TranslatorNote';
import type { SaveState } from './useAutosave';

/**
 * "Translation workspace" (Figma 370:11261, SPEC 5.4): context on the left,
 * translation in the middle, glossary and comments on the right. The current
 * image and language live in the URL (?image=2&lang=es) so they can be linked.
 */
export function EditorPage() {
  const { t } = useTranslation();
  const { projectId = '', itemId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const detail = useProjectDetail(projectId);
  const itemImages = useItemImages(itemId);
  const { data: members = [] } = useMembers();
  const [saveState, setSaveState] = useState<SaveState>('idle');

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.72fr)] [&>*]:min-w-0">
        <div className="flex flex-col gap-6">
          <SourceImageCard image={image} position={position} total={images.length} />
          {image && (
            // Keyed by image so an open edit form never carries over to another image.
            <SourceTextCard key={image.id} image={image} sourceLanguage={project.sourceLanguage} />
          )}
          <ImageStrip
            images={images}
            itemName={itemSummary.item.name}
            position={position}
            onSelect={(next) => navigate({ image: next })}
          />
        </div>

        <div className="flex flex-col gap-6">
          <LanguageCards
            languages={languages}
            images={images}
            translations={translations}
            selected={language}
            onSelect={(lang) => navigate({ lang })}
          />
          {image && language && (
            <TranslationEditor
              // A new editor per image and language: drafts never leak between them.
              key={`${image.id}-${language}`}
              image={image}
              language={language}
              languages={languages}
              translation={translationOf(language)}
              members={members}
              onLanguageChange={(lang) => navigate({ lang })}
              onSaveStateChange={setSaveState}
            />
          )}
          {image && language && languages.length > 1 && (
            <ComparisonCard
              languages={languages.filter((l) => l !== language)}
              translationOf={translationOf}
              members={members}
              onEdit={(lang) => navigate({ lang })}
            />
          )}
          <TranslatorNote item={itemSummary.item} />
        </div>

        <div className="flex flex-col gap-6">
          <EditorGlossaryCard
            projectId={project.id}
            texts={[image?.source.text ?? '', (language && translationOf(language)?.text) || '']}
          />
          {image && (
            <CommentsCard
              imageId={image.id}
              languages={languages}
              defaultLanguage={language ?? null}
              members={members.filter(
                (m) => project.managerIds.includes(m.id) || project.memberIds.includes(m.id),
              )}
              allMembers={members}
            />
          )}
        </div>
      </div>
    </>
  );
}
