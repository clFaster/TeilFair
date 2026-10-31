import { AVATAR_TONES } from './avatarTone';

interface AvatarProps {
  name: string;
  /** Stable color slot, e.g. from `memberTone()`. */
  tone?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Decorative initial chip; the name itself is always rendered next to it. */
export function Avatar({ name, tone = 0, size = 'md', className }: Readonly<AvatarProps>) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  const classes = ['avatar', `avatar-${size}`, `avatar-tone-${tone % AVATAR_TONES}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden="true">
      {initial}
    </span>
  );
}
