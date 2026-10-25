import { Switch, ToggleGroup } from 'radix-ui';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import type { ThemePreference } from '@/app/theme/theme';
import { useTheme } from '@/app/theme/useTheme';
import { InvalidBackupError, readBackupFile } from '@/app/workspace/fetchDemoWorkspace';
import { useWorkspace } from '@/app/workspace/WorkspaceContext';
import { useRepositories } from '@/data/RepositoryContext';
import { useUpdateWorkspaceSettings, useWorkspaceSettings } from '@/data/hooks';
import { canManageMembers } from '@/domain/members';
import { UI_LANGUAGES } from '@/i18n';
import { dangerNeutralButton, neutralButton } from '@/ui/buttons';
import { downloadBackup } from './backup';
import { DeleteDataDialog } from './DeleteDataDialog';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

const REPOSITORY_URL = 'https://github.com/EduardoGomezPueyo/translator-tool';

/**
 * Settings > General (no design, spec approved by the author, DECISIONS D37,
 * D41): appearance for this browser, project visibility and data for the
 * workspace, and what the app is.
 */
export function GeneralPage() {
  const { t } = useTranslation();
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h2 className="font-heading text-lg leading-tight font-bold text-text">
        {t('general.title')}
      </h2>
      <AppearanceSection />
      <VisibilitySection />
      <DataSection />
      <AboutSection />
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-1">
      <h3 id={headingId} className="text-base font-semibold text-text">
        {title}
      </h3>
      {note && <p className="text-sm text-text-secondary">{note}</p>}
      <div className="mt-2 flex flex-col divide-y divide-border rounded-2xl border border-border">
        {children}
      </div>
    </section>
  );
}

/** One setting: its name and help on the left, its control on the right. */
function Row({
  label,
  help,
  labelId,
  children,
}: {
  label: string;
  help?: ReactNode;
  labelId?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <span id={labelId} className="text-sm text-text">
          {label}
        </span>
        {help && <span className="text-sm text-text-secondary">{help}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  labelledBy,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  labelledBy: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      // Radix sends '' when the active item is clicked again: keep it.
      onValueChange={(next) => next && onChange(next as T)}
      aria-labelledby={labelledBy}
      className="flex rounded-full border border-border-strong p-0.5"
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className="rounded-full px-3 py-1 text-sm text-text-secondary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong data-[state=on]:bg-fill-subtle data-[state=on]:text-text"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}

function AppearanceSection() {
  const { t, i18n } = useTranslation();
  const { preference, setPreference } = useTheme();
  const themeId = useId();
  const languageId = useId();

  return (
    <Section title={t('general.appearance')} note={t('general.appearanceNote')}>
      <Row label={t('general.theme')} labelId={themeId}>
        <Segmented
          value={preference}
          onChange={setPreference}
          labelledBy={themeId}
          options={THEMES.map((theme) => ({ value: theme, label: t(`general.themes.${theme}`) }))}
        />
      </Row>
      <Row label={t('general.language')} labelId={languageId}>
        <Segmented
          value={i18n.resolvedLanguage ?? 'en'}
          onChange={(language) => void i18n.changeLanguage(language)}
          labelledBy={languageId}
          options={UI_LANGUAGES.map((language) => ({
            value: language,
            // Each language is named in itself, so it can be found in either interface.
            label: t(`languages.${language}`),
          }))}
        />
      </Row>
    </Section>
  );
}

function VisibilitySection() {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const settings = useWorkspaceSettings();
  const update = useUpdateWorkspaceSettings();
  const manage = canManageMembers(currentUser);
  const labelId = useId();

  return (
    <Section title={t('general.visibility')} note={manage ? undefined : t('general.managersOnly')}>
      <Row
        label={t('general.workersSeeOnlyTheirs')}
        labelId={labelId}
        help={t('general.workersSeeOnlyTheirsHelp')}
      >
        <Switch.Root
          checked={settings.data?.workersSeeOnlyTheirProjects ?? true}
          onCheckedChange={(checked) => update.mutate({ workersSeeOnlyTheirProjects: checked })}
          disabled={!manage || !settings.data || update.isPending}
          aria-labelledby={labelId}
          className="relative h-6 w-11 shrink-0 rounded-full border border-border-strong bg-fill-subtle outline-none focus-visible:ring-2 focus-visible:ring-border-strong disabled:opacity-60 data-[state=checked]:border-accent data-[state=checked]:bg-accent"
        >
          <Switch.Thumb className="block size-5 translate-x-px rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-[21px]" />
        </Switch.Root>
      </Row>
    </Section>
  );
}

function DataSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { workspace: repository } = useRepositories();
  const workspace = useWorkspace();
  const manage = canManageMembers(currentUser);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'backup' | 'restore' | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inDemo = workspace.kind === 'demo';

  const backup = async () => {
    setBusy('backup');
    setMessage(null);
    try {
      await downloadBackup(repository);
    } catch (error) {
      console.error('Could not make the backup', error);
      setMessage({ text: t('general.backupError'), error: true });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (file: File) => {
    if (!window.confirm(t('general.restoreConfirm', { name: file.name }))) return;
    setBusy('restore');
    setMessage(null);
    try {
      const { data, files, settings } = await readBackupFile(file);
      await repository.replace(data, files, settings);
      // Ids from the old workspace may not exist any more.
      await navigate('/settings/general');
      workspace.reload();
    } catch (error) {
      if (!(error instanceof InvalidBackupError)) console.error('Could not restore', error);
      setMessage({
        text: t(
          error instanceof InvalidBackupError ? 'general.notABackup' : 'general.restoreError',
        ),
        error: true,
      });
      setBusy(null);
    }
  };

  return (
    <Section
      title={t('general.data')}
      note={manage ? t('general.dataNote') : t('general.managersOnly')}
    >
      <Row label={t('general.backup')} help={t('general.backupHelp')}>
        <button
          type="button"
          onClick={() => void backup()}
          disabled={!manage || busy !== null}
          className={neutralButton}
        >
          {busy === 'backup' ? t('general.preparing') : t('general.downloadBackup')}
        </button>
      </Row>

      {inDemo ? (
        <Row label={t('general.demoData')} help={t('general.demoDataHelp')}>
          <button
            type="button"
            onClick={() => {
              void navigate('/projects');
              workspace.exitDemo();
            }}
            className={neutralButton}
          >
            {t('demo.exit')}
          </button>
        </Row>
      ) : (
        <>
          <Row label={t('general.restore')} help={t('general.restoreHelp')}>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label={t('general.restoreFile')}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void restore(file);
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={!manage || busy !== null}
              className={neutralButton}
            >
              {busy === 'restore' ? t('general.restoring') : t('general.restoreButton')}
            </button>
          </Row>
          <Row label={t('general.deleteAll')} help={t('general.deleteAllHelp')}>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              disabled={!manage || busy !== null}
              className={dangerNeutralButton}
            >
              {t('general.deleteAllButton')}
            </button>
          </Row>
        </>
      )}

      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={`px-5 py-3 text-sm ${message.error ? 'text-danger' : 'text-text-secondary'}`}
        >
          {message.text}
        </p>
      )}

      <DeleteDataDialog
        open={deleting}
        onOpenChange={setDeleting}
        onConfirm={async () => {
          await repository.reset();
          await navigate('/settings/general');
          workspace.reload();
        }}
      />
    </Section>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  return (
    <Section title={t('general.about')}>
      <Row label={t('general.appName')} help={t('general.appDescription')}>
        <span className="text-sm text-text-secondary">
          {t('general.version', { version: __APP_VERSION__ })}
        </span>
      </Row>
      <Row label={t('general.license')} help={t('general.licenseHelp')}>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm text-sm font-semibold text-accent-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-border-strong"
        >
          {t('general.sourceCode')} ↗
        </a>
      </Row>
    </Section>
  );
}
