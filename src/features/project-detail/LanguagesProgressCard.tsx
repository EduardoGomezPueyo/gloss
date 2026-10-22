import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { toPercent, type LanguageProgress } from '@/domain/progress';
import { Card, CardTitle } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';

/**
 * "Languages Progress" card (SPEC 5.2). In the section detail it shows that
 * section's numbers and has no Add language button (DECISIONS D28).
 */
export function LanguagesProgressCard({
  languages,
  footer,
}: {
  languages: LanguageProgress[];
  footer?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const titleId = useId();

  return (
    <Card labelledBy={titleId} className="h-full">
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.languagesProgress')}</CardTitle>
        <span className="rounded-full bg-tag-bg px-3 py-1 text-xs font-semibold text-text-secondary">
          {t('projectDetail.languageCount', { count: languages.length })}
        </span>
      </div>
      {languages.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('projectDetail.noLanguages')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {languages.map(({ language, progress, status }) => (
            <li
              key={language}
              className="grid grid-cols-[minmax(0,1fr)_3rem_6.5rem] items-center gap-2"
            >
              <span className="truncate text-base font-semibold text-text">
                {languageName(language, locale)}
              </span>
              <span className="text-sm text-text-secondary">{toPercent(progress)}%</span>
              <span className="flex justify-end">
                <StatusBadge status={status} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-auto flex justify-center pt-4">{footer}</div>}
    </Card>
  );
}
