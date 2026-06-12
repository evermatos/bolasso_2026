import { Check, Clock3, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isPredictionLocked } from '../lib/predictionDeadline'
import type { Match, Prediction } from '../types'

type Props = {
  match: Match
  prediction?: Prediction
  isAdmin?: boolean
  onSave: (matchId: number, home: number, away: number) => Promise<boolean>
}

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dubai',
  timeZoneName: 'short',
})

export function TeamFlag({ team, flag }: { team: string; flag: string }) {
  const localFlags: Record<string, string> = {
    Escócia: `${import.meta.env.BASE_URL}flags/scotland.svg`,
    Inglaterra: `${import.meta.env.BASE_URL}flags/england.svg`,
  }
  const localFlag = localFlags[team]

  return localFlag ? (
    <img alt={`Bandeira de ${team}`} className="flag-image" src={localFlag} />
  ) : (
    <span aria-hidden="true" className="flag">{flag}</span>
  )
}

export function MatchCard({ match, prediction, isAdmin, onSave }: Props) {
  const showFinalScore = isAdmin || match.status === 'finished'
  const initialHome = showFinalScore ? match.home_score : prediction?.home_score
  const initialAway = showFinalScore ? match.away_score : prediction?.away_score
  const [home, setHome] = useState(initialHome?.toString() ?? '')
  const [away, setAway] = useState(initialAway?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [now, setNow] = useState(Date.now())
  const kickoffStarted = now >= new Date(match.kickoff_at).getTime()
  const locked = !isAdmin && isPredictionLocked(match.kickoff_at, now)
  const adminLocked = Boolean(isAdmin && !kickoffStarted)

  useEffect(() => {
    setHome(initialHome?.toString() ?? '')
    setAway(initialAway?.toString() ?? '')
  }, [initialAway, initialHome])

  useEffect(() => {
    if ((!isAdmin && locked) || (isAdmin && kickoffStarted)) return

    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [isAdmin, kickoffStarted, locked])

  async function save() {
    if (home === '' || away === '') return
    setSaving(true)
    setSaved(false)
    const succeeded = await onSave(match.id, Number(home), Number(away))
    setSaving(false)
    if (succeeded) {
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    }
  }

  return (
    <article className={`match-card ${match.status === 'finished' ? 'finished' : ''}`}>
      <div className="match-meta">
        <span>{match.stage}</span>
        <span>
          <Clock3 size={14} />
          {formatter.format(new Date(match.kickoff_at))} · Abu Dhabi
        </span>
      </div>

      <div className="match-teams">
        <div className="team home-team">
          <TeamFlag flag={match.home_flag} team={match.home_team} />
          <strong>{match.home_team}</strong>
        </div>

        <div className="score-inputs">
          <input
            aria-label={`Gols de ${match.home_team}`}
            disabled={adminLocked || locked || (match.status === 'finished' && !isAdmin)}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => setHome(event.target.value)}
            type="number"
            value={home}
          />
          <span>×</span>
          <input
            aria-label={`Gols de ${match.away_team}`}
            disabled={adminLocked || locked || (match.status === 'finished' && !isAdmin)}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => setAway(event.target.value)}
            type="number"
            value={away}
          />
        </div>

        <div className="team away-team">
          <TeamFlag flag={match.away_flag} team={match.away_team} />
          <strong>{match.away_team}</strong>
        </div>
      </div>

      <div className="match-footer">
        <span className="venue">{match.venue}</span>
        {match.status === 'finished' && !isAdmin ? (
          prediction ? (
            <div className="prediction-result">
              <span>
                Seu palpite: {prediction.home_score} × {prediction.away_score}
              </span>
              <strong className="points-badge">+{prediction.points ?? 0} pts</strong>
            </div>
          ) : (
            <span className="locked-label">Sem palpite</span>
          )
        ) : adminLocked ? (
          <span className="locked-label">Aguardando o início do jogo</span>
        ) : locked && !isAdmin ? (
          <span className="locked-label">Palpites encerrados</span>
        ) : (
          <button
            className="save-button"
            disabled={saving || home === '' || away === ''}
            onClick={save}
            type="button"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saved ? 'Salvo' : isAdmin ? 'Publicar resultado' : 'Salvar palpite'}
          </button>
        )}
      </div>
    </article>
  )
}
