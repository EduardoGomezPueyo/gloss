import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useMembers, useProjectDetail } from '@/data/hooks';
import { AddLanguagePopover } from './AddLanguagePopover';
import { ExportDialog } from './ExportDialog';
import { GlossaryCard } from './GlossaryCard';
import { LanguagesProgressCard } from './LanguagesProgressCard';
import { OverviewCard } from './OverviewCard';
import { ProjectHeader } from './ProjectHeader';
import { SectionDialog } from './SectionDialog';
import { SectionProgressCard } from './SectionProgressCard';
import { DetailGrid, PageMessage } from './shared';

/** State passed to the section detail to open "Add content to section" (phase 4). */
export interface SectionLocationState {
  addContent?: boolean;
}

/** "Project details view" (Figma 370:10566, SPEC 5.2). */
export function ProjectDetailPage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const detail = useProjectDetail(projectId);
  const { data: members = [] } = useMembers();
  const [addingSection, setAddingSection] = useState(false);

  if (detail.isPending) {
    return <p className="text-sm text-text-tertiary">{t('projectDetail.loading')}</p>;
  }
  if (detail.isError) return <PageMessage role="alert">{t('data.loadError')}</PageMessage>;
  if (!detail.data) return <PageMessage>{t('projectDetail.notFound')}</PageMessage>;

  const { project, sections, languages } = detail.data;

  return (
    <>
      <ProjectHeader summary={detail.data} actions={<ExportDialog project={project} />} />

      <DetailGrid>
        <OverviewCard summary={detail.data} members={members} />
        <GlossaryCard projectId={project.id} />
        <SectionProgressCard
          projectId={project.id}
          sections={sections}
          onAddSection={() => setAddingSection(true)}
        />
        <LanguagesProgressCard
          languages={languages}
          footer={<AddLanguagePopover project={project} />}
        />
      </DetailGrid>

      <SectionDialog
        mode={addingSection ? { kind: 'create', projectId: project.id } : null}
        onOpenChange={setAddingSection}
        onCreated={(section, addContent) => {
          if (!addContent) return;
          const state: SectionLocationState = { addContent: true };
          void navigate(`/projects/${project.id}/sections/${section.id}`, { state });
        }}
      />
    </>
  );
}
