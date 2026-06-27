import { Check, Clock3, Info, LoaderCircle, Save, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isPredictionLocked } from '../lib/predictionDeadline'
import type { Match, Prediction } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  match: Match
  prediction?: Prediction
  isAdmin?: boolean
  onAskOracle?: (match: Match) => void
  onShowInfo?: (match: Match) => void
  onSave: (
    matchId: number,
    home: number,
    away: number,
    options?: {
      awayPenalty?: number | null
      homePenalty?: number | null
      silent?: boolean
    },
  ) => Promise<boolean>
}

const formatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dubai',
  timeZoneName: 'short',
})

export function MatchCard({
  match,
  prediction,
  isAdmin,
  onAskOracle,
  onSave,
  onShowInfo,
}: Props) {
  const showFinalScore = isAdmin || match.status === 'finished'
  const initialHome = showFinalScore ? match.home_score : prediction?.home_score
  const initialAway = showFinalScore ? match.away_score : prediction?.away_score
  const initialHomePenalty = showFinalScore ? match.home_penalty_score : null
  const initialAwayPenalty = showFinalScore ? match.away_penalty_score : null
  const [home, setHome] = useState(initialHome?.toString() ?? '')
  const [away, setAway] = useState(initialAway?.toString() ?? '')
  const [homePenalty, setHomePenalty] = useState(initialHomePenalty?.toString() ?? '')
  const [awayPenalty, setAwayPenalty] = useState(initialAwayPenalty?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [now, setNow] = useState(Date.now())
  const lastSavedScore = useRef(
    prediction ? `${prediction.home_score}:${prediction.away_score}` : '',
  )
  const savingRef = useRef(false)
  const kickoffStarted = now >= new Date(match.kickoff_at).getTime()
  const locked = !isAdmin && isPredictionLocked(match.kickoff_at, now)
  const adminLocked = Boolean(isAdmin && !kickoffStarted)
  const isKnockoutMatch = match.match_number >= 73
  const needsPenaltyScore =
    Boolean(isAdmin && isKnockoutMatch && home !== '' && away !== '' && home === away)

  useEffect(() => {
    setHome(initialHome?.toString() ?? '')
    setAway(initialAway?.toString() ?? '')
    setHomePenalty(initialHomePenalty?.toString() ?? '')
    setAwayPenalty(initialAwayPenalty?.toString() ?? '')
    if (!isAdmin && prediction) {
      lastSavedScore.current = `${prediction.home_score}:${prediction.away_score}`
    }
  }, [initialAway, initialAwayPenalty, initialHome, initialHomePenalty, isAdmin, prediction])

  useEffect(() => {
    if ((!isAdmin && locked) || (isAdmin && kickoffStarted)) return

    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [isAdmin, kickoffStarted, locked])

  const save = useCallback(async (silent = false) => {
    if (home === '' || away === '' || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setSaved(false)
    const succeeded = await onSave(
      match.id,
      Number(home),
      Number(away),
      {
        awayPenalty: needsPenaltyScore ? Number(awayPenalty) : null,
        homePenalty: needsPenaltyScore ? Number(homePenalty) : null,
        silent,
      },
    )
    savingRef.current = false
    setSaving(false)
    if (succeeded) {
      lastSavedScore.current = `${home}:${away}`
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    }
  }, [away, awayPenalty, home, homePenalty, match.id, needsPenaltyScore, onSave])

  useEffect(() => {
    if (isAdmin || locked || home === '' || away === '') return

    const score = `${home}:${away}`
    if (score === lastSavedScore.current) return

    const timer = window.setTimeout(() => {
      void save(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [away, home, isAdmin, locked, save])

  const isBrazilMatch =
    match.home_team === 'Brasil' || match.away_team === 'Brasil'

  return (
    <article
      className={`match-card ${match.status === 'finished' ? 'finished' : ''} ${
        isBrazilMatch ? 'brazil-match' : ''
      }`}
    >
      <div className="match-meta">
        <span>{match.stage}</span>
        <div>
          {onShowInfo && (
            <button
              aria-label={`Ver classificação e resultados do ${match.stage}`}
              className="match-info-button"
              onClick={() => onShowInfo(match)}
              type="button"
            >
              <Info size={14} />
              <span>Info do grupo</span>
            </button>
          )}
          <span>
            <Clock3 size={14} />
            {formatter.format(new Date(match.kickoff_at))} · Abu Dhabi
          </span>
        </div>
      </div>

      {needsPenaltyScore && (
        <div className="penalty-inputs">
          <span>Pênaltis</span>
          <input
            aria-label={`Pênaltis de ${match.home_team}`}
            disabled={adminLocked}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => setHomePenalty(event.target.value)}
            type="number"
            value={homePenalty}
          />
          <strong>×</strong>
          <input
            aria-label={`Pênaltis de ${match.away_team}`}
            disabled={adminLocked}
            inputMode="numeric"
            max="99"
            min="0"
            onChange={(event) => setAwayPenalty(event.target.value)}
            type="number"
            value={awayPenalty}
          />
        </div>
      )}

      <div className="match-teams">
        <div className="team home-team">
          <TeamFlag fallback={match.home_flag} team={match.home_team} />
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
          <TeamFlag fallback={match.away_flag} team={match.away_team} />
          <strong>{match.away_team}</strong>
        </div>
      </div>

      <div className="match-footer">
        <div className="match-footer-side">
          <span className="venue">{match.venue}</span>
          {onAskOracle && (
            <button
              aria-label={`Consultar o polvo vidente para ${match.home_team} contra ${match.away_team}`}
              className="oracle-button"
              onClick={() => onAskOracle(match)}
              type="button"
            >
              <Sparkles size={14} />
              Polvo vidente
            </button>
          )}
        </div>
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
            disabled={
              saving ||
              home === '' ||
              away === '' ||
              (needsPenaltyScore && (homePenalty === '' || awayPenalty === ''))
            }
            onClick={() => save(false)}
            type="button"
          >
            {saving ? (
              <LoaderCircle className="spin" size={16} />
            ) : saved ? (
              <Check size={16} />
            ) : (
              <Save size={16} />
            )}
            {saving
              ? 'Salvando...'
              : saved
                ? 'Confirmado'
                : isAdmin
                  ? match.status === 'finished'
                    ? 'Atualizar resultado'
                    : 'Publicar resultado'
                  : 'Confirmar palpite'}
          </button>
        )}
      </div>
    </article>
  )
}
