import { CalendarDays, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { Match } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  match: Match
  matches: Match[]
  onClose: () => void
}

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dubai',
  timeZoneName: 'short',
})

function teamHistory(team: string, matches: Match[], currentMatchNumber: number) {
  return matches
    .filter(
      (match) =>
        match.match_number < currentMatchNumber &&
        (match.home_team === team || match.away_team === team),
    )
    .sort((left, right) => left.match_number - right.match_number)
}

function TeamHistory({
  matches,
  team,
}: {
  matches: Match[]
  team: string
}) {
  return (
    <div className="knockout-history-team">
      <h3>{team}</h3>
      {matches.length === 0 ? (
        <p>Nenhum jogo anterior encontrado.</p>
      ) : (
        <div className="knockout-history-list">
          {matches.map((match) => {
            const isHome = match.home_team === team
            const opponent = isHome ? match.away_team : match.home_team
            const teamFlag = isHome ? match.home_flag : match.away_flag
            const opponentFlag = isHome ? match.away_flag : match.home_flag

            return (
              <article key={`${team}-${match.id}`}>
                <div className="knockout-history-line">
                  <p>
                    <TeamFlag fallback={teamFlag} team={team} />
                    <strong>{team}</strong>
                    <span>vs</span>
                    <TeamFlag fallback={opponentFlag} team={opponent} />
                    <strong>{opponent}</strong>
                  </p>
                  <small>
                    {match.status === 'finished'
                      ? `${match.home_score} × ${match.away_score}`
                      : formatter.format(new Date(match.kickoff_at))}
                  </small>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function KnockoutInfoModal({ match, matches, onClose }: Props) {
  const homeHistory = useMemo(
    () => teamHistory(match.home_team, matches, match.match_number),
    [match.home_team, match.match_number, matches],
  )
  const awayHistory = useMemo(
    () => teamHistory(match.away_team, matches, match.match_number),
    [match.away_team, match.match_number, matches],
  )

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      aria-labelledby="knockout-info-title"
      aria-modal="true"
      className="group-info-overlay"
      role="dialog"
    >
      <button
        aria-label="Fechar informações do jogo"
        className="group-info-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="group-info-modal knockout-info-modal">
        <div className="group-info-header">
          <div>
            <span className="eyebrow">CONTEXTO DO MATA-MATA</span>
            <h2 id="knockout-info-title">Jogo {match.match_number}</h2>
            <p>Histórico das seleções neste Bolasso antes do confronto.</p>
          </div>
          <button
            aria-label="Fechar"
            className="group-info-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="knockout-info-matchup">
          <span>
            <TeamFlag fallback={match.home_flag} team={match.home_team} />
            {match.home_team}
          </span>
          <strong>×</strong>
          <span>
            {match.away_team}
            <TeamFlag fallback={match.away_flag} team={match.away_team} />
          </span>
        </div>

        <div className="knockout-info-meta">
          <CalendarDays size={14} />
          {formatter.format(new Date(match.kickoff_at))} · Abu Dhabi
        </div>

        <div className="knockout-history-grid">
          <TeamHistory matches={homeHistory} team={match.home_team} />
          <TeamHistory matches={awayHistory} team={match.away_team} />
        </div>
      </section>
    </div>
  )
}
