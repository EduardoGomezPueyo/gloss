import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef } from 'react';

/*
 * "Live" Markdown editor of Edit entry (Figma 370:6480): the syntax stays visible
 * ("## History") but headings, emphasis and links are styled. Typing [[ suggests
 * the titles of other entries (DECISIONS D31). Colours come from the theme tokens.
 */

const highlight = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)' },
  { tag: tags.heading2, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)' },
  { tag: [tags.heading3, tags.heading4], fontWeight: '700', color: 'var(--text)' },
  { tag: tags.strong, fontWeight: '700', color: 'var(--text)' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: [tags.link, tags.url], color: 'var(--accent-text)' },
  { tag: tags.processingInstruction, color: 'var(--text-tertiary)' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, monospace' },
]);

const theme = EditorView.theme({
  '&': { color: 'var(--text-tertiary)', backgroundColor: 'transparent', fontSize: '0.875rem' },
  '&.cm-focused': { outline: 'none' },
  // The design writes Markdown in the normal text font, with the syntax visible.
  '.cm-scroller': { fontFamily: 'inherit' },
  '.cm-content': {
    fontFamily: 'inherit',
    lineHeight: '22px',
    padding: '0',
    caretColor: 'var(--text)',
  },
  '.cm-line': { padding: '0' },
  '.cm-cursor': { borderLeftColor: 'var(--text)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--diff-added)',
  },
  '.cm-placeholder': { color: 'var(--text-tertiary)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--popup)',
    border: '1px solid var(--border-strong)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul > li': { padding: '0.25rem 0.75rem', color: 'var(--text)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--fill-subtle)',
    color: 'var(--text)',
  },
});

/** Suggests entry titles after "[[" and closes the link. */
function wikiLinkCompletion(titles: () => string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(/\[\[[^\]\n]*/);
    if (!match) return null;
    return {
      from: match.from + 2,
      options: titles().map((title) => ({ label: title, apply: `${title}]]` })),
      validFor: /^[^\]\n]*$/,
    };
  };
}

export function MarkdownEditor({
  value,
  onChange,
  titles,
  labelledBy,
  describedBy,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Titles offered after [[. */
  titles: string[];
  labelledBy: string;
  describedBy?: string;
  placeholder?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Read through refs so the editor is created once.
  const latest = useRef({ onChange, titles });
  useEffect(() => {
    latest.current = { onChange, titles };
  });

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown(),
          syntaxHighlighting(highlight),
          EditorView.lineWrapping,
          autocompletion({ override: [wikiLinkCompletion(() => latest.current.titles)] }),
          placeholder ? placeholderExtension(placeholder) : [],
          EditorView.contentAttributes.of({
            'aria-labelledby': labelledBy,
            ...(describedBy ? { 'aria-describedby': describedBy } : {}),
            'aria-multiline': 'true',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) latest.current.onChange(update.state.doc.toString());
          }),
          theme,
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // The editor is created once; later value changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside changes (discard, restore) replace the document.
  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  return (
    <div
      ref={host}
      className="min-h-64 rounded-lg focus-within:ring-2 focus-within:ring-border-strong focus-within:ring-offset-8 focus-within:ring-offset-surface"
    />
  );
}
