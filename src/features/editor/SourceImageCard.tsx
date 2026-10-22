import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImageFile } from '@/data/hooks';
import type { SceneImage } from '@/domain/types';
import { Card, CardTitle } from '@/ui/Card';
import { CloseIcon } from '@/ui/CloseIcon';
import { useObjectUrl } from './useObjectUrl';

const ZOOM_STEPS = [1, 1.5, 2, 3];

const iconButton =
  'inline-flex size-7 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-fill-subtle hover:text-text focus-visible:ring-2 focus-visible:ring-border-strong disabled:opacity-40';

/** "Source image" card: the scene, its position in the item, zoom and full screen. */
export function SourceImageCard({
  image,
  position,
  total,
}: {
  image: SceneImage | undefined;
  position: number;
  total: number;
}) {
  const { t } = useTranslation();
  const file = useImageFile(image?.fileId ?? null);
  const url = useObjectUrl(file.data);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex]!;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{t('editor.sourceImage')}</CardTitle>
        {total > 0 && (
          <span className="text-sm text-text-secondary">
            {t('editor.imageCounter', { position: pad(position), total: pad(total) })}
          </span>
        )}
      </div>

      <div className="aspect-video overflow-auto rounded-md bg-app">
        {url ? (
          <img
            src={url}
            alt={image?.fileName ?? ''}
            className="h-full w-full origin-top-left object-contain"
            style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-tertiary">
            {t('editor.noImageFile')}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="truncate text-sm text-text-secondary">{image?.fileName}</span>
        {url && (
          <div className="flex shrink-0 items-center gap-1 text-sm text-text-secondary">
            <button
              type="button"
              aria-label={t('editor.zoomOut')}
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((i) => i - 1)}
              className={iconButton}
            >
              −
            </button>
            <span className="w-12 text-center" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label={t('editor.zoomIn')}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() => setZoomIndex((i) => i + 1)}
              className={iconButton}
            >
              +
            </button>
            <FullScreen url={url} alt={image?.fileName ?? ''} />
          </div>
        )}
      </div>
    </Card>
  );
}

function FullScreen({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation();
  return (
    <Dialog.Root>
      <Dialog.Trigger aria-label={t('editor.fullScreen')} className={iconButton}>
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4">
          <path
            d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-4 z-40 flex items-center justify-center outline-none"
        >
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>
          <img src={url} alt={alt} className="max-h-full max-w-full object-contain" />
          <Dialog.Close
            aria-label={t('addContent.close')}
            className="absolute top-0 right-0 inline-flex size-9 items-center justify-center rounded-lg bg-popup text-text outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <CloseIcon />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
