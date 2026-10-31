/** Number of avatar color slots defined in cards.css (.avatar-tone-0 ... -4). */
export const AVATAR_TONES = 5;

/** A member keeps the same avatar color everywhere: its position in the member list. */
export const memberTone = (members: ReadonlyArray<{ id: string }>, memberId: string) =>
  Math.max(0, members.findIndex((member) => member.id === memberId));
