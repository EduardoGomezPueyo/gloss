import { useTranslation } from 'react-i18next';
import { Card, CardTitle } from '@/ui/Card';
import { ExternalLinkIcon } from '@/ui/icons';

/** Glossary panel of the editor: arrives with the project glossary in phase 6 (DECISIONS D30). */
export function EditorGlossaryCard() {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{t('editor.glossary')}</CardTitle>
        <span
          role="link"
          aria-disabled="true"
          title={t('nav.notAvailable')}
          className="flex cursor-not-allowed items-center gap-1.5 text-sm font-semibold text-text-tertiary"
        >
          {t('editor.fullGlossary')}
          <ExternalLinkIcon className="size-3.5" />
        </span>
      </div>
      <p className="text-sm text-text-tertiary">{t('editor.glossarySoon')}</p>
    </Card>
  );
}
