import { Popover } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '@/app/currentUser/useCurrentUser';
import { useMoveItems } from '@/data/hooks';
import type { ContentItem, Id, Section } from '@/domain/types';
import { accentButton, neutralButton, textButton } from '@/ui/buttons';
import { Field, SelectInput } from '@/ui/form';

/** "Move to section" popover (Figma 373:8070, SPEC 5.3). */
export function MoveToSectionPopover({
  items,
  destinations,
  onMoved,
}: {
  /** The selected items, in list order. */
  items: ContentItem[];
  /** The project's other sections. */
  destinations: Section[];
  onMoved: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className={neutralButton}>
        {t('sectionDetail.moveToSection')}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-40 flex w-[470px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border-strong bg-card p-6 shadow-2xl outline-none"
        >
          {open && (
            <MoveForm
              items={items}
              destinations={destinations}
              onDone={() => {
                setOpen(false);
                onMoved();
              }}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MoveForm({
  items,
  destinations,
  onDone,
}: {
  items: ContentItem[];
  destinations: Section[];
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const moveItems = useMoveItems();
  const [destination, setDestination] = useState<Id | null>(null);
  const id = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!destination) return;
    moveItems.mutate(
      { itemIds: items.map((i) => i.id), sectionId: destination, by: currentUser?.id ?? null },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} aria-labelledby={`${id}-title`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p id={`${id}-title`} className="font-heading text-lg font-bold text-text">
          {t('sectionDetail.moveTitle')}
        </p>
        <p className="text-sm text-text-secondary">
          {t('sectionDetail.moveSelection', {
            count: items.length,
            names: items.map((i) => i.name).join(', '),
          })}
        </p>
      </div>

      {destinations.length === 0 ? (
        <p className="text-sm text-text-tertiary">{t('sectionDetail.noOtherSections')}</p>
      ) : (
        <Field label={t('sectionDetail.destination')} htmlFor={`${id}-destination`}>
          <SelectInput
            id={`${id}-destination`}
            value={destination}
            onChange={setDestination}
            placeholder={t('sectionDetail.destinationPlaceholder')}
            options={destinations.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>
      )}

      <p className="-mt-2 text-sm text-text-secondary">{t('sectionDetail.keepNotice')}</p>
      {moveItems.isError && (
        <p role="alert" className="-mt-2 text-sm text-danger">
          {t('sectionDetail.moveError')}
        </p>
      )}

      <div className="flex items-center justify-between gap-4">
        <Popover.Close type="button" className={`${textButton} text-base`}>
          {t('sectionDetail.cancel')}
        </Popover.Close>
        <button
          type="submit"
          disabled={!destination || moveItems.isPending}
          className={accentButton}
        >
          {t('sectionDetail.move', { count: items.length })}
        </button>
      </div>
    </form>
  );
}
