import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardTitle } from '@/ui/Card';
import { ExternalLinkIcon } from '@/ui/icons';

/** "Glossary" card (SPEC 5.2). The project glossary arrives in phase 6, so the link is disabled. */
export function GlossaryCard() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card labelledBy={titleId}>
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.glossary')}</CardTitle>
        <span
          role="link"
          aria-disabled="true"
          aria-label={t('projectDetail.openGlossary')}
          title={t('nav.notAvailable')}
          className="cursor-not-allowed text-text-tertiary"
        >
          <ExternalLinkIcon className="size-5" />
        </span>
      </div>
      <p className="text-base text-text-secondary">{t('projectDetail.glossaryDescription')}</p>
    </Card>
  );
}
