import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from '@/ui/CloseIcon';
import type { Upload } from './useUploads';

/**
 * "Image ordering" strip (Figma 370:11978): the chosen images with their position,
 * reordered by dragging (pointer or keyboard, dnd-kit). × takes an image out.
 */
export function ImageOrdering({
  images,
  onReorder,
  onRemove,
  onPreview,
}: {
  images: Upload[];
  onReorder: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation();
  const ids = images.map((i) => i.id);
  const sensors = useSensors(
    // A short drag distance keeps clicks on × working.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const nameOf = (id: string | number) => images.find((i) => i.id === id)?.file.name ?? '';
  const positionOf = (id: string | number | undefined) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('addContent.drag.start', { name: nameOf(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('addContent.drag.over', { name: nameOf(active.id), position: positionOf(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('addContent.drag.end', { name: nameOf(active.id), position: positionOf(over.id) })
        : undefined,
    onDragCancel: () => t('addContent.drag.cancel'),
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  if (images.length === 0) {
    return (
      <p className="flex h-[100px] items-center justify-center text-base text-text-secondary italic">
        {t('addContent.orderingEmpty')}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('addContent.drag.instructions') },
      }}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <ol className="flex min-h-[100px] items-center gap-6 overflow-x-auto pt-1 pb-3">
          {images.map((image, index) => (
            <SortableThumbnail
              key={image.id}
              image={image}
              position={index + 1}
              onRemove={() => onRemove(image.id)}
              onPreview={() => onPreview(image.id)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableThumbnail({
  image,
  position,
  onRemove,
  onPreview,
}: {
  image: Upload;
  position: number;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const name = image.file.name;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative shrink-0 ${isDragging ? 'z-10 opacity-80' : ''}`}
      onMouseEnter={onPreview}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={t('addContent.position', { position, name })}
        onFocus={onPreview}
        className="block cursor-grab touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-strong active:cursor-grabbing"
      >
        <img
          src={image.url}
          alt=""
          draggable={false}
          className="h-[70px] w-[100px] rounded-md object-cover"
        />
      </div>
      <span
        aria-hidden
        className="absolute -right-2 -bottom-2 inline-flex size-5 items-center justify-center rounded-full bg-popup text-[11px] font-semibold text-text ring-2 ring-card"
      >
        {position}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('addContent.removeImage', { name })}
        className="absolute -top-2 -right-2 inline-flex size-5 items-center justify-center rounded-full bg-popup text-text opacity-0 ring-2 ring-card outline-none group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <CloseIcon className="size-3" />
      </button>
    </li>
  );
}
