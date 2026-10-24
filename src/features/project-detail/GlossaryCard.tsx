import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card } from '@/ui/Card';
import { ExternalLinkIcon } from '@/ui/icons';

/** "Glossary" card (SPEC 5.2): opens the project glossary. */
export function GlossaryCard({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Card labelledBy={titleId}>
      <div className="flex items-center justify-between gap-4">
        {/* Smaller than the other card titles in both detail frames (16px, not 18px). */}
        <h2 id={titleId} className="font-heading text-base leading-[19px] font-bold text-text">
          {t('projectDetail.glossary')}
        </h2>
        <Link
          to={`/projects/${projectId}/glossary`}
          aria-label={t('projectDetail.openGlossary')}
          title={t('projectDetail.openGlossary')}
          className="rounded-md text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <ExternalLinkIcon className="size-4" />
        </Link>
      </div>
      <p className="text-sm text-text-secondary">{t('projectDetail.glossaryDescription')}</p>
    </Card>
  );
}
