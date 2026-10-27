import { useTranslation } from 'react-i18next';
import { GlossMark } from '@/ui/GlossMark';
import { neutralButton } from '@/ui/buttons';

/**
 * Full-screen loading screen, without the sidebar (DECISIONS D48): the mark, the
 * name and what is loading. index.html holds a static copy for the first paint;
 * keep both in step. With `onRetry` it shows the error and a retry button instead.
 */
export function LoadingScreen({
  message,
  onRetry,
  leaving = false,
}: {
  message: string;
  onRetry?: () => void;
  /** Fading out over the app that has just loaded. */
  leaving?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      aria-hidden={leaving}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-app transition-opacity duration-300 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <GlossMark animated={!onRetry} className="size-18" />
      <p className="mt-5 text-[28px] leading-none font-semibold tracking-tight text-text">
        {t('general.appName')}
      </p>
      {onRetry ? (
        <div role="alert" className="mt-3 flex flex-col items-center gap-4">
          <p className="text-sm text-text-secondary">{message}</p>
          <button type="button" className={neutralButton} onClick={onRetry}>
            {t('loadingScreen.retry')}
          </button>
        </div>
      ) : (
        <p role="status" className="mt-3 text-sm text-text-tertiary">
          {message}
        </p>
      )}
    </div>
  );
}
