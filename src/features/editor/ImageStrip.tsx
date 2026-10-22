import { useTranslation } from 'react-i18next';
import { useImageFile } from '@/data/hooks';
import { imageLabel } from '@/domain/images';
import type { SceneImage } from '@/domain/types';
import { neutralButton, textButton } from '@/ui/buttons';
import { Card, CardTitle } from '@/ui/Card';
import { ArrowLeftIcon, ChevronRightIcon } from '@/ui/icons';
import { useObjectUrl } from './useObjectUrl';

/**
 * "Images in this item" (SPEC 5.4; the design says "section"): thumbnails with
 * position and Current / Next marks, plus Previous / Next image.
 */
export function ImageStrip({
  images,
  itemName,
  position,
  onSelect,
}: {
  images: SceneImage[];
  itemName: string;
  position: number;
  onSelect: (position: number) => void;
}) {
  const { t } = useTranslation();
  if (images.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{t('editor.imagesInItem')}</CardTitle>
        <span className="text-sm text-text-secondary">
          {t('editor.imageCount', { count: images.length })}
        </span>
      </div>
      <ol className="grid grid-cols-2 gap-3">
        {images.map((image, index) => (
          <Thumbnail
            key={image.id}
            image={image}
            number={index + 1}
            label={imageLabel(itemName, index + 1)}
            mark={
              index + 1 === position
                ? t('editor.current')
                : index + 1 === position + 1
                  ? t('editor.next')
                  : null
            }
            current={index + 1 === position}
            onSelect={() => onSelect(index + 1)}
          />
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={position <= 1}
          onClick={() => onSelect(position - 1)}
          className={textButton}
        >
          <ArrowLeftIcon />
          {t('editor.previousImage')}
        </button>
        <button
          type="button"
          disabled={position >= images.length}
          onClick={() => onSelect(position + 1)}
          className={neutralButton}
        >
          {t('editor.nextImage')}
          <ChevronRightIcon />
        </button>
      </div>
    </Card>
  );
}

function Thumbnail({
  image,
  number,
  label,
  mark,
  current,
  onSelect,
}: {
  image: SceneImage;
  number: number;
  label: string;
  mark: string | null;
  current: boolean;
  onSelect: () => void;
}) {
  const file = useImageFile(image.fileId);
  const url = useObjectUrl(file.data);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={current ? 'true' : undefined}
        className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-strong ${
          current
            ? 'border-accent/50 bg-accent/5'
            : 'border-border-strong hover:border-text-tertiary'
        }`}
      >
        {url ? (
          <img src={url} alt="" className="h-12 w-20 shrink-0 rounded object-cover" />
        ) : (
          <span aria-hidden className="h-12 w-20 shrink-0 rounded bg-app" />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`text-sm font-semibold ${current ? 'text-accent-text' : 'text-text'}`}>
            {String(number).padStart(2, '0')}
            {mark && ` · ${mark}`}
          </span>
          <span className="truncate text-sm text-text-secondary">{label}</span>
        </span>
      </button>
    </li>
  );
}
