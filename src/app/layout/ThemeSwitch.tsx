import { Switch } from 'radix-ui';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/useTheme';

/**
 * Light/dark switch next to the avatar (DECISIONS D26). Until the user flips it,
 * the theme follows the system preference.
 */
export function ThemeSwitch() {
  const { t } = useTranslation();
  const { theme, setPreference } = useTheme();
  const dark = theme === 'dark';

  return (
    <Switch.Root
      checked={dark}
      onCheckedChange={(checked) => setPreference(checked ? 'dark' : 'light')}
      aria-label={t('sidebar.darkMode')}
      title={t('sidebar.darkMode')}
      className="relative h-5 w-9 shrink-0 rounded-full border border-border-strong bg-fill-subtle outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
    >
      <Switch.Thumb className="flex size-4 translate-x-px items-center justify-center rounded-full bg-surface text-text-secondary shadow-sm transition-transform data-[state=checked]:translate-x-[17px]">
        {dark ? <MoonIcon /> : <SunIcon />}
      </Switch.Thumb>
    </Switch.Root>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 1.5v1.5m0 10v1.5M1.5 8H3m10 0h1.5M3.4 3.4l1 1m7.2 7.2 1 1m0-9.2-1 1m-7.2 7.2-1 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3">
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
