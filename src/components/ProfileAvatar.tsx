export const PROFILE_AVATARS = [
  { key: 'classic-ball', label: 'Bola clássica', emoji: '⚽' },
  { key: 'golden-cup', label: 'Taça dourada', emoji: '🏆' },
  { key: 'goalkeeper', label: 'Luva de goleiro', emoji: '🧤' },
  { key: 'football-boot', label: 'Chuteira', emoji: '👟' },
  { key: 'supporter-horn', label: 'Corneta da torcida', emoji: '📣' },
  { key: 'stadium-drum', label: 'Tambor', emoji: '🥁' },
  { key: 'goal-net', label: 'Gol', emoji: '🥅' },
  { key: 'brazil', label: 'Brasil', emoji: '🇧🇷' },
] as const

export type ProfileAvatarKey = (typeof PROFILE_AVATARS)[number]['key']

type Props = {
  avatarKey?: string | null
  displayName: string
  size?: 'small' | 'medium' | 'large'
}

export function ProfileAvatar({
  avatarKey,
  displayName,
  size = 'medium',
}: Props) {
  const avatar =
    PROFILE_AVATARS.find((item) => item.key === avatarKey) ??
    PROFILE_AVATARS[0]

  return (
    <span
      aria-label={`${avatar.label}, avatar de ${displayName}`}
      className={`profile-avatar profile-avatar-${avatar.key} profile-avatar-${size}`}
      role="img"
      title={avatar.label}
    >
      {avatar.emoji}
    </span>
  )
}
