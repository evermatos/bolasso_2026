import { CalendarDays, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { calculateGroupStandings } from '../lib/groupStandings'
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

export function GroupInfoModal({ match, matches, onClose }: Props) {
  const groupMatches = useMemo(
    () => matches.filter((candidate) => candidate.stage === match.stage),
    [match.stage, matches],
  )
  const groupStanding = useMemo(
    () =>
      calculateGroupStandings(groupMatches).find(
        (standing) => standing.group === match.stage,
      ),
    [groupMatches, match.stage],
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
      aria-labelledby="group-info-title"
      aria-modal="true"
      className="group-info-overlay"
      role="dialog"
    >
      <button
        aria-label="Fechar informações do grupo"
        className="group-info-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="group-info-modal">
        <div className="group-info-header">
          <div>
            <span className="eyebrow">CONTEXTO DO PALPITE</span>
            <h2 id="group-info-title">{match.stage}</h2>
            <p>
              Classificação e jogos do grupo para ajudar no seu palpite.
            </p>
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

        {groupStanding && (
          <div className="group-info-section">
            <h3>Classificação</h3>
            <div className="group-info-standings">
              {groupStanding.rows.map((row, index) => (
                <div
                  className={`${index < 2 ? 'qualified' : ''} ${
                    index === 2 ? 'third-place' : ''
                  }`}
                  key={row.team}
                >
                  <span className="group-info-position">{index + 1}</span>
                  <span className="group-info-team">
                    <TeamFlag fallback={row.flag} team={row.team} />
                    <strong>{row.team}</strong>
                  </span>
                  <span><strong>{row.points}</strong><small>Pts</small></span>
                  <span><strong>{row.played}</strong><small>J</small></span>
                  <span>
                    <strong>
                      {row.goalDifference > 0 ? '+' : ''}
                      {row.goalDifference}
                    </strong>
                    <small>SG</small>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="group-info-section">
          <h3>Jogos do grupo</h3>
          <div className="group-info-matches">
            {groupMatches.map((groupMatch) => (
              <article key={groupMatch.id}>
                <span className="group-info-match-number">
                  Jogo {groupMatch.match_number}
                </span>
                <div className="group-info-match-teams">
                  <span>
                    <TeamFlag
                      fallback={groupMatch.home_flag}
                      team={groupMatch.home_team}
                    />
                    {groupMatch.home_team}
                  </span>
                  <strong>
                    {groupMatch.status === 'finished'
                      ? `${groupMatch.home_score} × ${groupMatch.away_score}`
                      : '×'}
                  </strong>
                  <span>
                    {groupMatch.away_team}
                    <TeamFlag
                      fallback={groupMatch.away_flag}
                      team={groupMatch.away_team}
                    />
                  </span>
                </div>
                <div className="group-info-match-meta">
                  {groupMatch.status === 'finished' ? (
                    <span>Resultado publicado</span>
                  ) : (
                    <>
                      <CalendarDays size={14} />
                      <span>
                        {formatter.format(new Date(groupMatch.kickoff_at))} ·
                        Abu Dhabi
                      </span>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
