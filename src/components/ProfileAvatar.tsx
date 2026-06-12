export const PROFILE_AVATARS = [
  { key: 'classic-ball', label: 'Bola clássica', emoji: '⚽' },
  { key: 'golden-cup', label: 'Taça dourada', emoji: '🏆' },
  { key: 'goalkeeper', label: 'Goleiro mão de alface', emoji: '🧤' },
  { key: 'football-boot', label: 'Chuteira assassina', emoji: '👟' },
  { key: 'supporter-horn', label: 'Corneteiro oficial', emoji: '📣' },
  { key: 'stadium-drum', label: 'Batuqueiro da torcida', emoji: '🥁' },
  { key: 'goal-net', label: 'Inimigo do gol', emoji: '🥅' },
  { key: 'brazil', label: 'Canarinho pistola', emoji: '🇧🇷' },
  { key: 'argentina-ten', label: 'Camisa 10 argentina', emoji: '🐐' },
  { key: 'portugal-seven', label: 'Camisa 7 portuguesa', emoji: '🤖' },
  { key: 'penguin-striker', label: 'Pinguim artilheiro', emoji: '🐧' },
  { key: 'var-alien', label: 'Alienígena do VAR', emoji: '👽' },
  { key: 'capybara-fan', label: 'Capivara torcedora', emoji: '🦫' },
  { key: 'ball-wizard', label: 'Mago da bola', emoji: '🧙' },
  { key: 'angry-referee', label: 'Juiz bravo', emoji: '🟥' },
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
