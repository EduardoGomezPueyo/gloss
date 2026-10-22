import { useTranslation } from 'react-i18next';
import { useImageFile } from '@/data/hooks';
import { useObjectUrl } from '../editor/useObjectUrl';

/** One stored image, or an empty frame while it loads. */
export function StoredImage({
  fileId,
  alt,
  className,
}: {
  fileId: string;
  alt: string;
  className: string;
}) {
  const file = useImageFile(fileId);
  const url = useObjectUrl(file.data);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <span aria-hidden className={`block bg-app ${className}`} />
  );
}

/** Entry gallery (Figma 370:6424): the first image large, the others small beside it. */
export function Gallery({ fileIds, title }: { fileIds: string[]; title: string }) {
  const { t } = useTranslation();
  if (fileIds.length === 0) return null;
  const [first, ...rest] = fileIds;
  const alt = (position: number) => t('glossary.entry.image', { position, title });

  return (
    <div className="flex gap-6">
      <StoredImage
        fileId={first!}
        alt={alt(1)}
        className="h-52 w-auto max-w-72 rounded-md object-contain"
      />
      {rest.length > 0 && (
        <div className="grid grid-flow-col grid-rows-2 gap-3">
          {rest.map((fileId, index) => (
            <StoredImage
              key={fileId}
              fileId={fileId}
              alt={alt(index + 2)}
              className="size-24 rounded-md object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}
