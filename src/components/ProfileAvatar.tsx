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
  { key: 'octopus-oracle', label: 'Polvo místico superior', emoji: '🐙' },
  { key: 'lucky-socks', label: 'Meião da sorte', emoji: '🧦' },
  { key: 'tactical-board', label: 'Prancheta do professor', emoji: '📋' },
  { key: 'vuvuzela-chaos', label: 'Vuvuzela do caos', emoji: '📯' },
  { key: 'wizard-staff', label: 'Cajado do palpite', emoji: '🪄' },
  { key: 'pizza-var', label: 'Pizza no VAR', emoji: '🍕' },
  { key: 'dragon-goalie', label: 'Dragão goleiro', emoji: '🐉' },
  { key: 'ninja-winger', label: 'Ponta ninja', emoji: '🥷' },
  { key: 'rocket-shot', label: 'Chute foguete', emoji: '🚀' },
  { key: 'trophy-ghost', label: 'Fantasma da taça', emoji: '👻' },
  { key: 'robot-coach', label: 'Técnico robô', emoji: '🤖' },
  { key: 'unicorn-fan', label: 'Unicórnio torcedor', emoji: '🦄' },
  { key: 'king-ball', label: 'Rei da bola', emoji: '👑' },
  { key: 'hotdog-stadium', label: 'Hot dog de estádio', emoji: '🌭' },
  { key: 'sleepy-striker', label: 'Atacante sonolento', emoji: '💤' },
  { key: 'fortune-cookie', label: 'Biscoito da sorte', emoji: '🥠' },
  { key: 'thunder-cleat', label: 'Chuteira trovão', emoji: '⚡' },
  { key: 'space-referee', label: 'Juiz espacial', emoji: '🛸' },
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
