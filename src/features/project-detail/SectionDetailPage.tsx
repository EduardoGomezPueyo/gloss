import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMembers, useProjectDetail } from '@/data/hooks';
import { ArrowLeftIcon, ChevronRightIcon } from '@/ui/icons';
import { AddContentDialog } from './addContent/AddContentDialog';
import { ContentItemsCard } from './ContentItemsCard';
import { GlossaryCard } from './GlossaryCard';
import { LanguagesProgressCard } from './LanguagesProgressCard';
import { ProjectHeader } from './ProjectHeader';
import { SectionCard } from './SectionCard';
import { SectionDialog } from './SectionDialog';
import type { SectionLocationState } from './ProjectDetailPage';
import { DetailGrid, PageMessage } from './shared';

/** "Section details view" (Figma 370:10799, SPEC 5.3). */
export function SectionDetailPage() {
  const { t } = useTranslation();
  const { projectId = '', sectionId = '' } = useParams();
  const detail = useProjectDetail(projectId);
  const { data: members = [] } = useMembers();
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // "Create and add content" (D27) arrives with this state: open the modal once.
  const [addingContent, setAddingContent] = useState(
    () => (location.state as SectionLocationState | null)?.addContent === true,
  );
  useEffect(() => {
    if ((location.state as SectionLocationState | null)?.addContent) {
      void navigate('.', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  if (detail.isPending) {
    return <p className="text-sm text-text-tertiary">{t('projectDetail.loading')}</p>;
  }
  if (detail.isError) return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  if (!detail.data) return <PageMessage>{t('projectDetail.notFound')}</PageMessage>;

  const { project, sections } = detail.data;
  const summary = sections.find((s) => s.section.id === sectionId);
  if (!summary) return <PageMessage>{t('sectionDetail.notFound')}</PageMessage>;

  return (
    <>
      <div className="flex flex-col gap-4">
        <ProjectHeader summary={detail.data} />
        <nav
          aria-label={t('sectionDetail.breadcrumb')}
          className="flex flex-wrap items-center justify-between gap-4 text-base"
        >
          <ol className="flex min-w-0 items-center gap-3">
            <li>
              <Link
                to={`/projects/${project.id}`}
                className="flex items-center gap-3 rounded-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
              >
                <ArrowLeftIcon />
                {t('sectionDetail.allSections')}
              </Link>
            </li>
            <li aria-hidden className="text-text-secondary">
              <ChevronRightIcon className="size-3.5" />
            </li>
            <li aria-current="page" className="truncate font-semibold text-text">
              {summary.section.name}
            </li>
          </ol>
          <span className="text-sm text-text-secondary">{project.code}</span>
        </nav>
      </div>

      <DetailGrid>
        <SectionCard
          summary={summary}
          project={project}
          members={members}
          onEdit={() => setEditing(true)}
        />
        <GlossaryCard />
        <ContentItemsCard
          projectId={project.id}
          summary={summary}
          sections={sections.map((s) => s.section)}
          members={members}
          onAddContent={() => setAddingContent(true)}
        />
        <LanguagesProgressCard languages={summary.languages} />
      </DetailGrid>

      <SectionDialog
        mode={editing ? { kind: 'edit', section: summary.section } : null}
        onOpenChange={setEditing}
      />
      <AddContentDialog
        open={addingContent}
        onOpenChange={setAddingContent}
        sectionId={summary.section.id}
        existingTypes={sections.flatMap((s) => s.items.map(({ item }) => item.type))}
      />
    </>
  );
}
