import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Member } from '@/domain/types';
import { Avatar } from '@/ui/Avatar';
import { normalizeForSearch } from '@/domain/filters';

/** The "@query" being typed right before the caret, if any. */
function mentionQuery(text: string, caret: number): string | null {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(text.slice(0, caret));
  return match ? match[1]! : null;
}

/**
 * Comment textarea with "@" suggestions (SPEC 5.4). Picking a person inserts
 * "@Full Name"; mentions are only highlighted, nobody is notified (out of scope).
 */
export function MentionTextarea({
  value,
  onChange,
  members,
  placeholder,
  label,
  rows = 3,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  members: Member[];
  placeholder: string;
  label: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const query = mentionQuery(value, caret);
  const suggestions =
    query === null || dismissed
      ? []
      : members
          .filter((m) => normalizeForSearch(m.name).includes(normalizeForSearch(query)))
          .slice(0, 5);
  const open = suggestions.length > 0;

  const insert = (member: Member) => {
    const before = value.slice(0, caret).replace(/@([^\s@]*)$/, `@${member.name} `);
    const next = before + value.slice(caret);
    onChange(next);
    setCaret(before.length);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(before.length, before.length);
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insert(suggestions[Math.min(active, suggestions.length - 1)]!);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setDismissed(true);
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textarea}
        value={value}
        rows={rows}
        autoFocus={autoFocus}
        aria-label={label}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setActive(0);
          setDismissed(false);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={onKeyDown}
        className="w-full resize-y rounded-lg border border-border-input bg-popup px-4 py-3 text-sm text-text outline-none placeholder:text-text-tertiary focus-visible:border-text-tertiary"
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('editor.mentions')}
          className="absolute bottom-full left-0 z-20 mb-1 flex w-60 flex-col gap-0.5 rounded-xl border border-border-strong bg-popup p-1 shadow-lg"
        >
          {suggestions.map((member, index) => (
            <li
              key={member.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Keep focus in the textarea while picking.
              onMouseDown={(e) => {
                e.preventDefault();
                insert(member);
              }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text ${
                index === active ? 'bg-fill-subtle' : ''
              }`}
            >
              <Avatar member={member} size="md" />
              {member.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A comment body with known "@Name" mentions highlighted. */
export function CommentBody({ body, members }: { body: string; members: Member[] }) {
  const names = members.map((m) => m.name).sort((a, b) => b.length - a.length);
  if (names.length === 0) return <>{body}</>;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = body.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-accent-text">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
