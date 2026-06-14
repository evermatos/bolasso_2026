import { Moon, Sun } from 'lucide-react'

type Props = {
  theme: 'light' | 'dark'
  onToggle: () => void
  className?: string
}

export function ThemeToggle({ theme, onToggle, className = '' }: Props) {
  const nextTheme = theme === 'dark' ? 'claro' : 'escuro'

  return (
    <button
      aria-label={`Ativar modo ${nextTheme}`}
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      title={`Ativar modo ${nextTheme}`}
      type="button"
    >
      {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  )
}
