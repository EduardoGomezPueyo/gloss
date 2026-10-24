import type { Member } from '@/domain/types';

const BACKGROUNDS = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6',
];

/** Stable colour per member, so the same person looks the same on every screen. */
function backgroundFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BACKGROUNDS[Math.abs(hash) % BACKGROUNDS.length]!;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0]![0], words.at(-1)![0]] : [words[0]?.[0]];
  return letters.join('').toUpperCase();
}

const SIZES = {
  sm: 'size-4 text-[7px]',
  md: 'size-6 text-[10px]',
  /** Member rows of Settings > Members (Figma: 30px). */
  row: 'size-[30px] text-[11px]',
  lg: 'size-9 text-xs',
};

type AvatarMember = Pick<Member, 'id' | 'name'>;

/** Member avatar. Members have no photo in v1, so it shows their initials. */
export function Avatar({
  member,
  size = 'sm',
  className = '',
}: {
  member: AvatarMember;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={member.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-avatar-foreground ring-1 ring-surface select-none ${SIZES[size]} ${backgroundFor(member.id)} ${className}`}
    >
      {initials(member.name)}
    </span>
  );
}

/** Overlapping avatars (Figma: 16px, -1px overlap). The names are announced as one label. */
export function AvatarStack({ members, max = 6 }: { members: AvatarMember[]; max?: number }) {
  const shown = members.slice(0, max);
  const hidden = members.length - shown.length;
  return (
    <span
      role="img"
      aria-label={members.map((m) => m.name).join(', ')}
      className="inline-flex items-center"
    >
      {shown.map((member, index) => (
        <Avatar key={member.id} member={member} className={index > 0 ? '-ml-px' : ''} />
      ))}
      {hidden > 0 && (
        <span aria-hidden className="ml-1 text-[10px] text-text-tertiary">
          +{hidden}
        </span>
      )}
    </span>
  );
}
