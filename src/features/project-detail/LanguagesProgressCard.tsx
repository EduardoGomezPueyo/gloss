import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { toPercent, type LanguageProgress } from '@/domain/progress';
import { Card, CardTitle } from '@/ui/Card';
import { StatusBadge } from '@/ui/StatusBadge';

/**
 * "Languages Progress" card (SPEC 5.2). In the section detail it shows that
 * section's numbers and has no Add language button (DECISIONS D28). The two
 * frames differ slightly: the section one shows the count as plain text and
 * gives the percentage its own column.
 */
export function LanguagesProgressCard({
  languages,
  footer,
  variant = 'project',
}: {
  languages: LanguageProgress[];
  footer?: ReactNode;
  variant?: 'project' | 'section';
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const titleId = useId();

  return (
    <Card labelledBy={titleId} className="h-full">
      <div className="flex items-center justify-between gap-4">
        <CardTitle id={titleId}>{t('projectDetail.languagesProgress')}</CardTitle>
        <span
          className={
            variant === 'section'
              ? 'text-[13px] text-text-secondary'
              : 'rounded-full bg-tag-bg px-2.5 py-1.5 text-xs leading-[14px] font-semibold text-text-secondary'
          }
        >
          {t('projectDetail.languageCount', { count: languages.length })}
        </span>
      </div>
      {languages.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('projectDetail.noLanguages')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {languages.map(({ language, progress, status }) => (
            <li
              key={language}
              className={`grid items-center ${
                variant === 'section'
                  ? 'grid-cols-[minmax(0,1fr)_35px_90px] gap-2.5'
                  : 'grid-cols-[minmax(0,1fr)_118px] gap-2'
              }`}
            >
              <span className="truncate text-[13px] leading-4 font-semibold text-text">
                {languageName(language, locale)}
              </span>
              <span
                className={
                  variant === 'section' ? 'contents' : 'flex items-center justify-between gap-2'
                }
              >
                <span className="text-xs text-text-secondary">{toPercent(progress)}%</span>
                <span className="flex justify-end">
                  <StatusBadge status={status} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {footer && <div className="mt-auto flex justify-center pt-4">{footer}</div>}
    </Card>
  );
}
