import { DropdownMenu } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { languageName } from '@/domain/languages';
import { aggregateStatus } from '@/domain/status';
import { isTranslated } from '@/domain/translationWorkflow';
import type { LanguageCode, SceneImage, Translation } from '@/domain/types';
import { menuClass, menuItemClass } from '@/ui/form';
import { CheckIcon, ChevronDownIcon } from '@/ui/icons';
import { StatusIcon } from '@/ui/StatusIcon';

/**
 * "Spanish ▾" (DECISIONS D40): picks the language being translated. Its menu lists
 * every target language with its status and "x/N translated" in this item.
 */
export function LanguagePicker({
  languages,
  images,
  translations,
  selected,
  onSelect,
}: {
  languages: LanguageCode[];
  images: SceneImage[];
  translations: Translation[];
  selected: LanguageCode;
  onSelect: (language: LanguageCode) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('editor.translationLanguage')}
        className="-ml-2 flex h-9 items-center gap-2 rounded-lg px-2 font-heading text-lg font-bold text-text outline-none hover:bg-fill-subtle focus-visible:ring-2 focus-visible:ring-border-strong"
      >
        {languageName(selected, locale)}
        <ChevronDownIcon className="size-4 text-text-secondary" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className={`${menuClass} min-w-72`}>
          <DropdownMenu.RadioGroup value={selected} onValueChange={onSelect}>
            {languages.map((language) => {
              const cells = images.map((image) =>
                translations.find((t) => t.imageId === image.id && t.language === language),
              );
              const status = aggregateStatus(cells.map((c) => c?.status ?? 'not-started'));
              const done = cells.filter(isTranslated).length;
              return (
                <DropdownMenu.RadioItem key={language} value={language} className={menuItemClass}>
                  <StatusIcon status={status} progress={done / (images.length || 1)} />
                  <span className="flex-1 truncate">{languageName(language, locale)}</span>
                  <span className="text-text-secondary">
                    {t('editor.translatedCount', { done, total: images.length })}
                  </span>
                  <span className="flex size-4 items-center justify-center">
                    <DropdownMenu.ItemIndicator>
                      <CheckIcon />
                    </DropdownMenu.ItemIndicator>
                  </span>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
