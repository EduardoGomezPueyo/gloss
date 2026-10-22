import { Checkbox, Dialog, RadioGroup } from 'radix-ui';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectData } from '@/data/hooks';
import { languageName } from '@/domain/languages';
import type { Project } from '@/domain/types';
import { buildExport, exportFileName } from '@/export/buildExport';
import { EXPORTERS, getExporter } from '@/export/registry';
import { neutralButton, primaryButton, secondaryButton } from '@/ui/buttons';
import { CloseIcon } from '@/ui/CloseIcon';
import { downloadFile } from '@/ui/downloadFile';
import { CheckIcon, ExternalLinkIcon } from '@/ui/icons';
import { LanguageFlag } from '@/ui/LanguageFlag';

/**
 * "Export to code" (SPEC 5.2, DECISIONS D33): choose the format (JSON or CSV),
 * the languages and whether unfinished translations go in, then download.
 */
export function ExportDialog({ project }: { project: Project }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={neutralButton}>
        <ExternalLinkIcon />
        {t('export.title')}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-30 flex max-h-[calc(100dvh-2rem)] w-[520px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border-strong bg-surface shadow-2xl outline-none">
          {open && <ExportForm project={project} onDone={() => setOpen(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ExportForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const data = useProjectData(project.id);
  const id = useId();
  const [format, setFormat] = useState(EXPORTERS[0]!.id);
  const [languages, setLanguages] = useState(project.targetLanguages);
  const [includeAll, setIncludeAll] = useState(false);
  const [failed, setFailed] = useState(false);

  const preview = useMemo(
    () =>
      data.data
        ? buildExport(
            data.data,
            { languages, include: includeAll ? 'all' : 'completed' },
            new Date(),
          )
        : null,
    [data.data, languages, includeAll],
  );
  const translations = preview
    ? preview.strings.reduce(
        (sum, s) => sum + Object.values(s.translations).filter((v) => v !== null).length,
        0,
      )
    : 0;
  const canDownload = preview !== null && languages.length > 0 && preview.strings.length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canDownload) return;
    try {
      const exporter = getExporter(format);
      // Stamp the real download time, not when the preview was built.
      const file = buildExport(
        data.data!,
        { languages, include: includeAll ? 'all' : 'completed' },
        new Date(),
      );
      downloadFile(
        exporter.serialize(file),
        exportFileName(project.code, exporter.extension),
        exporter.mimeType,
      );
      onDone();
    } catch (error) {
      console.error('Export failed', error);
      setFailed(true);
    }
  };

  const toggleLanguage = (code: string, checked: boolean) =>
    setLanguages((list) =>
      checked
        ? project.targetLanguages.filter((l) => l === code || list.includes(l))
        : list.filter((l) => l !== code),
    );

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <header className="flex items-start justify-between gap-4 px-8 pt-8 pb-2">
        <div className="flex flex-col gap-3">
          <Dialog.Title className="font-heading text-2xl leading-none font-bold text-text">
            {t('export.title')}
          </Dialog.Title>
          <Dialog.Description className="text-base text-text-secondary">
            {t('export.subtitle')}
          </Dialog.Description>
        </div>
        <Dialog.Close
          aria-label={t('export.close')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-fill-subtle text-text outline-none hover:bg-border-strong focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          <CloseIcon />
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-col gap-7 overflow-y-auto px-8 pt-6 pb-8">
        <fieldset className="flex flex-col gap-3">
          <legend id={`${id}-format`} className="mb-3 text-sm text-text">
            {t('export.format')}
          </legend>
          <RadioGroup.Root
            aria-labelledby={`${id}-format`}
            value={format}
            onValueChange={setFormat}
            className="grid grid-cols-2 gap-3"
          >
            {EXPORTERS.map((exporter) => (
              <RadioGroup.Item
                key={exporter.id}
                value={exporter.id}
                aria-describedby={`${id}-hint-${exporter.id}`}
                className="flex flex-col gap-1 rounded-lg border border-border-input p-4 text-left outline-none hover:border-text-tertiary focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-text-secondary data-[state=checked]:bg-fill-subtle"
              >
                <span className="text-base font-semibold text-text">{exporter.label}</span>
                <span id={`${id}-hint-${exporter.id}`} className="text-sm text-text-secondary">
                  {t(`export.formatHint.${exporter.id}`, { defaultValue: '' })}
                </span>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm text-text">{t('export.languages')}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {project.targetLanguages.map((code) => (
              <label key={code} className="flex items-center gap-2 text-sm text-text">
                <Box
                  checked={languages.includes(code)}
                  onChange={(checked) => toggleLanguage(code, checked)}
                />
                <LanguageFlag code={code} />
                {languageName(code, locale)}
              </label>
            ))}
          </div>
          {languages.length === 0 && (
            <p className="text-sm text-danger">{t('export.noLanguages')}</p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <Box checked={includeAll} onChange={setIncludeAll} />
            {t('export.include')}
          </label>
          <p className="text-sm text-text-secondary">{t('export.includeHint')}</p>
        </div>
      </div>

      <footer className="flex flex-col gap-4 border-t border-border px-8 py-6">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {failed ? (
            <span role="alert" className="text-danger">
              {t('export.error')}
            </span>
          ) : !preview ? (
            t('export.loading')
          ) : preview.strings.length === 0 ? (
            t('export.noStrings')
          ) : (
            t('export.summary', { strings: preview.strings.length, translations })
          )}
        </p>
        <div className="flex justify-end gap-3">
          <Dialog.Close type="button" className={secondaryButton}>
            {t('export.cancel')}
          </Dialog.Close>
          <button type="submit" disabled={!canDownload} className={primaryButton}>
            {t('export.download')}
          </button>
        </div>
      </footer>
    </form>
  );
}

function Box({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Checkbox.Root
      checked={checked}
      onCheckedChange={(value) => onChange(value === true)}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-border-strong data-[state=checked]:border-text data-[state=checked]:bg-text"
    >
      <Checkbox.Indicator>
        <CheckIcon className="size-3.5 text-surface" />
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
