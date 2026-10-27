/*
 * The Gloss mark (docs/brand): two text lines and two accent dots, drawn with theme
 * tokens so it follows light and dark. Decorative: the brand name sits next to it.
 * `animated` pulses the dots in turn for the loading screen (they stay still with
 * reduced motion).
 */
export function GlossMark({
  className = 'size-5',
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg aria-hidden viewBox="0 0 80 80" className={className}>
      <rect x="4" y="13" width="44" height="22" rx="11" className="fill-text" />
      <circle
        cx="65"
        cy="24"
        r="11"
        className={animated ? 'gloss-pulse fill-accent-text' : 'fill-accent-text'}
      />
      <circle
        cx="15"
        cy="56"
        r="11"
        className={animated ? 'gloss-pulse gloss-pulse-late fill-accent-text' : 'fill-accent-text'}
      />
      <rect x="32" y="45" width="44" height="22" rx="11" className="fill-text" />
    </svg>
  );
}
