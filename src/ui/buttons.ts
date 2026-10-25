/*
 * Button looks. Most screens use neutral buttons; the yellow accent is kept where
 * the design uses it (section detail, editor, settings — DECISIONS D13).
 */

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-strong aria-disabled:cursor-not-allowed aria-disabled:opacity-60 disabled:opacity-60';

/** "Add section", "Add language", "Export to code", "Move to section" (Figma: 36px tall, 14px text). */
export const neutralButton = `${base} bg-fill-subtle px-3 py-2 text-sm text-text-secondary hover:text-text`;

/** A neutral button for an action that destroys data ("Delete all data", D41). */
export const dangerNeutralButton = `${base} bg-fill-subtle px-3 py-2 text-sm text-danger hover:opacity-80`;

/** Page header actions "Add project", "Add entry" (Figma: 32px tall, 16px text). */
export const pageButton = `${base} bg-fill-subtle px-3 py-1 text-base text-text-secondary hover:text-text`;

/** "+ Add", "Move N items". */
export const accentButton = `${base} bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90`;

/** Main action of a modal ("Create project"). */
export const primaryButton = `${base} bg-button-primary px-5 py-2.5 text-base text-button-primary-foreground hover:opacity-90`;

/** Secondary action of a modal ("Cancel"). */
export const secondaryButton = `${base} bg-fill-subtle px-5 py-2.5 text-base text-text hover:bg-border-strong`;

/** Text-only action ("Clear selection", "Cancel" in popovers). */
export const textButton = `${base} rounded-md text-sm text-text-secondary hover:text-text`;

/** Larger text-only action ("Create new category", "View all" in the glossary). */
export const largeTextButton = `${base} rounded-md text-base text-text-secondary hover:text-text`;
