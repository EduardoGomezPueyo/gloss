import { HoverCard } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { toPercent, type ProjectSummary } from '@/domain/progress';
import { LanguageFlag } from '@/ui/LanguageFlag';
import { ProgressBar } from '@/ui/ProgressBar';
import { StatusIcon } from '@/ui/StatusIcon';

/**
 * Status icon that shows the per-language "Progress" popover on hover or focus
 * (Figma 370:5589). It sits above the row link so hovering it does not open the project.
 */
export function ProgressPopover({ summary }: { summary: ProjectSummary }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <HoverCard.Root openDelay={150} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <button
          type="button"
          className="relative z-10 inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <StatusIcon status={summary.status} progress={summary.progress} />
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-40 flex w-60 flex-col gap-4 rounded-2xl border border-border-strong bg-popup px-4 py-5 shadow-lg"
        >
          <p className="font-heading text-xs font-semibold text-text">
            {t('projects.progressTitle')}
          </p>
          {summary.languages.length === 0 && (
            <p className="text-xs text-text-tertiary">{t('projects.noTargetLanguages')}</p>
          )}
          <ul className="flex flex-col gap-4">
            {summary.languages.map(({ language, progress }) => {
              const name = languageName(language, locale);
              return (
                <li key={language} className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                    {name}
                    <LanguageFlag code={language} />
                  </span>
                  <span className="flex items-center gap-3">
                    <ProgressBar
                      value={progress}
                      label={t('projects.progressOf', { language: name })}
                    />
                    <span className="w-8 shrink-0 text-right text-[10px] text-text-secondary">
                      {toPercent(progress)}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}
