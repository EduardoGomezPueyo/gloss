import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useImageFile } from '@/data/hooks';
import type { SceneImage } from '@/domain/types';
import { CloseIcon } from '@/ui/CloseIcon';
import { ArrowLeftIcon } from '@/ui/icons';
import { iconButton } from './styles';
import { useObjectUrl } from './useObjectUrl';

const ZOOM_STEPS = [1, 1.5, 2, 3];

const pad = (n: number) => String(n).padStart(2, '0');

/** "01 / 02 in this item" with previous and next arrows, in the card header (D40). */
export function ImagePager({
  position,
  total,
  onSelect,
}: {
  position: number;
  total: number;
  onSelect: (position: number) => void;
}) {
  const { t } = useTranslation();
  if (total === 0) return null;
  return (
    <div className="flex items-center gap-3 text-sm text-text-secondary">
      <button
        type="button"
        aria-label={t('editor.previousImage')}
        disabled={position <= 1}
        onClick={() => onSelect(position - 1)}
        className={iconButton}
      >
        <ArrowLeftIcon />
      </button>
      <span aria-live="polite">
        <span className="font-semibold text-text">{pad(position)}</span>{' '}
        {t('editor.imageOf', { total: pad(total) })}
      </span>
      <button
        type="button"
        aria-label={t('editor.nextImage')}
        disabled={position >= total}
        onClick={() => onSelect(position + 1)}
        className={iconButton}
      >
        <ArrowLeftIcon className="size-4 rotate-180" />
      </button>
    </div>
  );
}

/** The scene image with its file name, zoom and full screen. */
export function SourceImage({ image }: { image: SceneImage | undefined }) {
  const { t } = useTranslation();
  const file = useImageFile(image?.fileId ?? null);
  const url = useObjectUrl(file.data);
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex]!;

  return (
    <div className="flex flex-col gap-3">
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

      <div className="flex items-center justify-between gap-4 px-4">
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
              <ZoomIcon out />
            </button>
            <span className="w-11 text-center" aria-live="polite">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label={t('editor.zoomIn')}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() => setZoomIndex((i) => i + 1)}
              className={iconButton}
            >
              <ZoomIcon />
            </button>
            <FullScreen url={url} alt={image?.fileName ?? ''} />
          </div>
        )}
      </div>
    </div>
  );
}

function ZoomIcon({ out }: { out?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-4">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.4" />
      <path
        d={out ? 'M5 7h4M10.5 10.5 14 14' : 'M5 7h4M7 5v4M10.5 10.5 14 14'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
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
            aria-label={t('editor.close')}
            className="absolute top-0 right-0 inline-flex size-9 items-center justify-center rounded-lg bg-popup text-text outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
          >
            <CloseIcon />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
