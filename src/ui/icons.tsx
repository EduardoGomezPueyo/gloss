/*
 * Small line glyphs used by the detail pages (16px grid, currentColor). Decorative:
 * the control that holds them carries the accessible name.
 */

type GlyphProps = { className?: string };

function Glyph({ className = 'size-4', d }: GlyphProps & { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const PlusIcon = (p: GlyphProps) => <Glyph {...p} d="M8 2.5v11M2.5 8h11" />;

export const ArrowLeftIcon = (p: GlyphProps) => <Glyph {...p} d="M13 8H3m4.5-4.5L3 8l4.5 4.5" />;

export const ChevronRightIcon = (p: GlyphProps) => <Glyph {...p} d="m6 3.5 4.5 4.5L6 12.5" />;

export const ChevronDownIcon = (p: GlyphProps) => <Glyph {...p} d="m4 6 4 4 4-4" />;

export const ExternalLinkIcon = (p: GlyphProps) => (
  <Glyph
    {...p}
    d="M9.5 2.5h4v4m0-4L7.5 8.5M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3"
  />
);

export const PencilIcon = (p: GlyphProps) => (
  <Glyph {...p} d="M10.5 3 13 5.5 6 12.5l-3 .5.5-3L10.5 3Z" />
);

export const CheckIcon = (p: GlyphProps) => <Glyph {...p} d="m3.5 8.5 3 3 6-7" />;

/** Filled triangle of the collapsible sections (Figma: Section Progress). */
export function DisclosureTriangle({ className = 'size-2.5' }: GlyphProps) {
  return (
    <svg aria-hidden viewBox="0 0 10 10" className={className}>
      <path d="M3 1.5 8 5 3 8.5Z" fill="currentColor" />
    </svg>
  );
}

export const UserPlusIcon = (p: GlyphProps) => (
  <Glyph
    {...p}
    d="M6.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 13.5c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4M12.5 5v4M10.5 7h4"
  />
);

export const UserMinusIcon = (p: GlyphProps) => (
  <Glyph
    {...p}
    d="M6.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 13.5c0-2.2 2-4 4.5-4s4.5 1.8 4.5 4M10.5 7h4"
  />
);

export const SidebarCollapseIcon = (p: GlyphProps) => (
  <Glyph {...p} d="M2.5 3.5h11v9h-11v-9ZM6 3.5v9M10.5 6.5 9 8l1.5 1.5" />
);

export const SidebarExpandIcon = (p: GlyphProps) => (
  <Glyph {...p} d="M2.5 3.5h11v9h-11v-9ZM6 3.5v9M9 6.5 10.5 8 9 9.5" />
);
