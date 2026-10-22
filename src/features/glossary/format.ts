import { useTranslation } from 'react-i18next';

/** "Today 3:42 PM", "Yesterday 5:47 PM" or "Sep 15, 6:33 PM" (Figma: Version history). */
export function useVersionDate() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en';
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (at: string, now = new Date()) => {
    const value = new Date(at);
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((day(now) - day(value)) / 86_400_000);
    if (days === 0) return t('glossary.history.today', { time: time.format(value) });
    if (days === 1) return t('glossary.history.yesterday', { time: time.format(value) });
    return date.format(value);
  };
}

/** Routes of a project's glossary. */
export const glossaryPaths = {
  overview: (projectId: string) => `/projects/${projectId}/glossary`,
  newEntry: (projectId: string) => `/projects/${projectId}/glossary/new`,
  entry: (projectId: string, entryId: string) => `/projects/${projectId}/glossary/${entryId}`,
  edit: (projectId: string, entryId: string) => `/projects/${projectId}/glossary/${entryId}/edit`,
  compare: (projectId: string, entryId: string, versionId: string) =>
    `/projects/${projectId}/glossary/${entryId}/compare/${versionId}`,
};
