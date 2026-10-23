import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '../workspace/WorkspaceContext';

const actionClass =
  'w-fit rounded-sm text-xs leading-none text-nav-unselected transition-colors outline-none hover:text-nav-selected focus-visible:ring-2 focus-visible:ring-border-strong disabled:cursor-wait';

/**
 * Demo controls below the avatar (DECISIONS D34): load the demo workspace, leave
 * it, and a link to real scene images. Hidden when the deployment has no demo.
 */
export function DemoControls() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { kind, demo, loadDemo, exitDemo } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!demo) return null;

  const load = async () => {
    setLoading(true);
    setFailed(false);
    // Leave any page of the current workspace: its ids do not exist in the demo.
    await navigate('/projects');
    try {
      await loadDemo();
    } catch (error) {
      console.error('Could not load the demo', error);
      setFailed(true);
      setLoading(false);
    }
  };

  const exit = async () => {
    await navigate('/projects');
    exitDemo();
  };

  return (
    <div className="flex flex-col gap-1.5">
      {kind === 'demo' ? (
        <div className="flex items-center gap-2">
          <span
            title={t('demo.activeHint')}
            className="rounded-full border border-border-strong px-1.5 py-0.5 text-xs leading-none text-text"
          >
            {t('demo.active')}
          </span>
          <button type="button" className={actionClass} onClick={() => void exit()}>
            {t('demo.exit')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={actionClass}
          disabled={loading}
          onClick={() => void load()}
        >
          {loading ? t('demo.loading') : t('demo.load')}
        </button>
      )}
      {failed && (
        <p role="alert" className="text-xs text-text-secondary">
          {t('demo.loadError')}
        </p>
      )}
      {demo.imagesUrl && (
        <a href={demo.imagesUrl} target="_blank" rel="noreferrer" className={actionClass}>
          {t('demo.realImages')} ↗
        </a>
      )}
    </div>
  );
}
