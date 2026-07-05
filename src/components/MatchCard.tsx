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
      predictedQualifier?: 'home' | 'away' | null
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
  const initialPredictedQualifier = prediction?.predicted_qualifier ?? null
  const [home, setHome] = useState(initialHome?.toString() ?? '')
  const [away, setAway] = useState(initialAway?.toString() ?? '')
  const [homePenalty, setHomePenalty] = useState(initialHomePenalty?.toString() ?? '')
  const [awayPenalty, setAwayPenalty] = useState(initialAwayPenalty?.toString() ?? '')
  const [predictedQualifier, setPredictedQualifier] = useState<
    'home' | 'away' | ''
  >(initialPredictedQualifier ?? '')
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
  const isRoundOf16OrLater = match.match_number >= 89
  const isQuarterfinalMatch = match.match_number >= 97 && match.match_number <= 100
  const needsPenaltyScore =
    Boolean(isAdmin && isKnockoutMatch && home !== '' && away !== '' && home === away)
  const needsPredictedQualifier =
    Boolean(!isAdmin && isKnockoutMatch && home !== '' && away !== '' && home === away)
  const finalScoreLabel =
    match.home_score !== null && match.away_score !== null
      ? match.home_penalty_score !== null && match.away_penalty_score !== null
        ? `${match.home_score} × ${match.away_score} (${match.home_penalty_score} × ${match.away_penalty_score})`
        : `${match.home_score} × ${match.away_score}`
      : 'Aguardando'
  const actualQualifier =
    match.status === 'finished' &&
    match.home_score !== null &&
    match.away_score !== null &&
    match.home_score === match.away_score &&
    match.home_penalty_score !== null &&
    match.away_penalty_score !== null
      ? match.home_penalty_score > match.away_penalty_score
        ? match.home_team
        : match.away_team
      : null
  const predictedQualifierTeam = prediction?.predicted_qualifier
    ? prediction.predicted_qualifier === 'home'
      ? match.home_team
      : match.away_team
    : null
  const predictedQualifierFlag = prediction?.predicted_qualifier
    ? prediction.predicted_qualifier === 'home'
      ? match.home_flag
      : match.away_flag
    : null

  useEffect(() => {
    setHome(initialHome?.toString() ?? '')
    setAway(initialAway?.toString() ?? '')
    setHomePenalty(initialHomePenalty?.toString() ?? '')
    setAwayPenalty(initialAwayPenalty?.toString() ?? '')
    setPredictedQualifier(initialPredictedQualifier ?? '')
    if (!isAdmin && prediction) {
      lastSavedScore.current = `${prediction.home_score}:${prediction.away_score}:${
        prediction.predicted_qualifier ?? ''
      }`
    }
  }, [
    initialAway,
    initialAwayPenalty,
    initialHome,
    initialHomePenalty,
    initialPredictedQualifier,
    isAdmin,
    prediction,
  ])

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
        predictedQualifier: needsPredictedQualifier
          ? predictedQualifier || null
          : null,
        silent,
      },
    )
    savingRef.current = false
    setSaving(false)
    if (succeeded) {
      lastSavedScore.current = `${home}:${away}:${
        needsPredictedQualifier ? predictedQualifier : ''
      }`
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1800)
    }
  }, [
    away,
    awayPenalty,
    home,
    homePenalty,
    match.id,
    needsPenaltyScore,
    needsPredictedQualifier,
    onSave,
    predictedQualifier,
  ])

  useEffect(() => {
    if (isAdmin || locked || home === '' || away === '') return

    if (needsPredictedQualifier && !predictedQualifier) return

    const score = `${home}:${away}:${needsPredictedQualifier ? predictedQualifier : ''}`
    if (score === lastSavedScore.current) return

    const timer = window.setTimeout(() => {
      void save(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [away, home, isAdmin, locked, needsPredictedQualifier, predictedQualifier, save])

  const isBrazilMatch =
    match.home_team === 'Brasil' || match.away_team === 'Brasil'

  if (match.status === 'finished' && !isAdmin) {
    return (
      <article className="participant-prediction">
        <span className="prediction-match-number">
          Jogo {match.match_number}
        </span>
        <div className="participant-prediction-score">
          <span>
            <TeamFlag fallback={match.home_flag} team={match.home_team} />
            {match.home_team}
          </span>
          {prediction ? (
            <strong>
              {prediction.home_score} × {prediction.away_score}
            </strong>
          ) : (
            <strong>Sem palpite</strong>
          )}
          <span>
            {match.away_team}
            <TeamFlag fallback={match.away_flag} team={match.away_team} />
          </span>
        </div>
        {prediction && predictedQualifierTeam && predictedQualifierFlag && (
          <div className="participant-qualifier-pick">
            <span>Se empatar:</span>
            <strong>
              <TeamFlag
                fallback={predictedQualifierFlag}
                team={predictedQualifierTeam}
              />
              {predictedQualifierTeam} se classifica
            </strong>
          </div>
        )}
        <div className="participant-prediction-result">
          <span>
            Resultado: {finalScoreLabel}
            {actualQualifier && ` · ${actualQualifier} se classificou`}
          </span>
          {prediction && <strong>+{prediction.points ?? 0} pts</strong>}
        </div>
      </article>
    )
  }

  return (
    <article
      className={`match-card ${match.status === 'finished' ? 'finished' : ''} ${
        isKnockoutMatch ? 'knockout-match-card' : ''
      } ${isRoundOf16OrLater ? 'round-of-16-match-card' : ''} ${
        isQuarterfinalMatch ? 'quarterfinal-match-card' : ''
      } ${
        isBrazilMatch ? 'brazil-match' : ''
      }`}
    >
      <div className="match-meta">
        <span>{match.stage}</span>
        <div>
          {onShowInfo && (
            <button
              aria-label={
                isKnockoutMatch
                  ? `Ver histórico de ${match.home_team} e ${match.away_team}`
                  : `Ver classificação e resultados do ${match.stage}`
              }
              className="match-info-button"
              onClick={() => onShowInfo(match)}
              type="button"
            >
              <Info size={14} />
              <span>{isKnockoutMatch ? 'Histórico' : 'Info do grupo'}</span>
            </button>
          )}
          <span>
            <Clock3 size={14} />
            {formatter.format(new Date(match.kickoff_at))} · Abu Dhabi
          </span>
        </div>
      </div>

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

      {needsPredictedQualifier && (
        <div className="qualifier-picker">
          <span>Se empatar, quem se classifica?</span>
          <div>
            <button
              className={predictedQualifier === 'home' ? 'active' : ''}
              disabled={locked}
              onClick={() => setPredictedQualifier('home')}
              type="button"
            >
              <TeamFlag fallback={match.home_flag} team={match.home_team} />
              {match.home_team}
            </button>
            <button
              className={predictedQualifier === 'away' ? 'active' : ''}
              disabled={locked}
              onClick={() => setPredictedQualifier('away')}
              type="button"
            >
              <TeamFlag fallback={match.away_flag} team={match.away_team} />
              {match.away_team}
            </button>
          </div>
        </div>
      )}

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
        {adminLocked ? (
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
              (needsPenaltyScore && (homePenalty === '' || awayPenalty === '')) ||
              (needsPredictedQualifier && !predictedQualifier)
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
