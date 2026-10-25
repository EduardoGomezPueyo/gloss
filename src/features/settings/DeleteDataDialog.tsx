import { Dialog } from 'radix-ui';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { secondaryButton } from '@/ui/buttons';
import { inputClass } from '@/ui/form';

/**
 * "Delete all data" (DECISIONS D41): asks to type a word first, since it cannot
 * be undone and nothing is kept anywhere else.
 */
export function DeleteDataDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-overlay" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-30 flex w-[480px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl outline-none">
          <Dialog.Title className="font-heading text-lg font-bold text-text">
            {t('general.deleteTitle')}
          </Dialog.Title>
          {open && <DeleteForm onCancel={() => onOpenChange(false)} onConfirm={onConfirm} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteForm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const word = t('general.deleteWord');
  const matches = typed.trim().toLowerCase() === word.toLowerCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!matches) return;
    setPending(true);
    setFailed(false);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Could not delete the workspace', error);
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <Dialog.Description className="text-sm text-text-secondary">
        {t('general.deleteDescription')}
      </Dialog.Description>
      <div className="flex flex-col gap-2">
        <label htmlFor={id} className="text-sm text-text">
          {t('general.deleteType', { word })}
        </label>
        <input
          id={id}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoFocus
          className={inputClass}
        />
      </div>
      {failed && (
        <p role="alert" className="text-sm text-danger">
          {t('general.deleteError')}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={secondaryButton}>
          {t('editor.cancel')}
        </button>
        <button
          type="submit"
          disabled={!matches || pending}
          className="inline-flex items-center justify-center rounded-xl bg-danger px-5 py-2.5 text-base text-surface outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-border-strong disabled:opacity-50"
        >
          {t('general.deleteAllButton')}
        </button>
      </div>
    </form>
  );
}
