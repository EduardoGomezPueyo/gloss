import { Popover } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useProjectAccess } from '@/app/projectAccess/ProjectAccessContext';
import { useAssign } from '@/data/hooks';
import { assigneeOf } from '@/domain/assignments';
import { languageName } from '@/domain/languages';
import { canEditProject } from '@/domain/projectDetails';
import type { Assignment, ContentItem, Member, Project } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { SelectInput } from '@/ui/form';

const NOBODY = 'nobody';

/**
 * Who translates a content item into each language (DECISIONS D44). Everyone sees
 * the assignees; managers change them, one person per language.
 */
export function ItemAssignees({
  project,
  item,
  assignments,
  members,
}: {
  project: Project;
  item: ContentItem;
  assignments: Assignment[];
  members: Member[];
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const { currentUser } = useCurrentUser();
  const { canWork } = useProjectAccess();
  const assign = useAssign();
  const editable = canWork && canEditProject(currentUser);

  const ofItem = assignments.filter((a) => a.contentItemId === item.id);
  const assignees = [...new Set(ofItem.map((a) => a.assigneeId))].flatMap(
    (id) => members.find((m) => m.id === id) ?? [],
  );
  const people = members.filter(
    (m) =>
      m.status === 'active' &&
      (project.managerIds.includes(m.id) || project.memberIds.includes(m.id)),
  );
  const summary =
    ofItem.length === 0
      ? t('assignees.none')
      : ofItem
          .map(
            (a) =>
              `${languageName(a.language, locale)}: ${members.find((m) => m.id === a.assigneeId)?.name ?? t('editor.someone')}`,
          )
          .join(', ');

  const face = (
    <span className="flex items-center gap-1.5">
      {assignees.length === 0 ? (
        <span>{t('assignees.unassigned')}</span>
      ) : (
        <span className="flex -space-x-1">
          {assignees.slice(0, 3).map((m) => (
            <span key={m.id} className="rounded-full ring-2 ring-card">
              <Avatar member={m} />
            </span>
          ))}
        </span>
      )}
    </span>
  );

  if (!editable) {
    return (
      <span title={summary} className="relative z-10 text-[11px] text-text-secondary">
        <span className="sr-only">{t('assignees.label', { name: item.name })}: </span>
        {face}
      </span>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t('assignees.change', { name: item.name, summary })}
        title={summary}
        className="relative z-10 rounded-md px-1 py-0.5 text-[11px] text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        {face}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 flex w-80 flex-col gap-3 rounded-2xl border border-border-strong bg-popup p-4 shadow-lg outline-none"
        >
          <p className="text-sm font-semibold text-text">
            {t('assignees.title', { name: item.name })}
          </p>
          {project.targetLanguages.length === 0 ? (
            <p className="text-sm text-text-tertiary">{t('editor.noLanguages')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {project.targetLanguages.map((language) => {
                const name = languageName(language, locale);
                return (
                  <li key={language} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm text-text">{name}</span>
                    <SelectInput
                      value={assigneeOf(ofItem, item.id, language) ?? NOBODY}
                      onChange={(value) =>
                        currentUser &&
                        assign.mutate({
                          itemId: item.id,
                          language,
                          assigneeId: value === NOBODY ? null : value,
                          by: currentUser.id,
                        })
                      }
                      label={t('assignees.for', { language: name })}
                      options={[
                        { value: NOBODY, label: t('assignees.unassigned') },
                        ...people.map((m) => ({ value: m.id, label: m.name })),
                      ]}
                      className="h-8 w-44 shrink-0 gap-2 rounded-lg bg-fill-subtle px-3 text-[13px] text-text outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {assign.isError && (
            <p role="alert" className="text-sm text-danger">
              {t('assignees.error')}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
