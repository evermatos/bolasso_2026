import {
  ArrowDown,
  ArrowUp,
  Eye,
  LoaderCircle,
  Medal,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ParticipantPrediction, RankingRow } from '../types'
import { ProfileAvatar } from './ProfileAvatar'
import { TeamFlag } from './TeamFlag'

type Props = {
  rows: RankingRow[]
  groupRows: RankingRow[]
  knockoutRows: RankingRow[]
  currentUserId?: string
  finalPublished: boolean
}

type RankingView = 'overall' | 'knockout' | 'groups'

function compareParticipantPredictions(
  left: ParticipantPrediction,
  right: ParticipantPrediction,
  view: RankingView,
) {
  if (view === 'knockout') {
    return (
      new Date(right.kickoff_at).getTime() -
        new Date(left.kickoff_at).getTime() ||
      right.match_number - left.match_number
    )
  }

  if (view === 'groups') {
    return right.match_number - left.match_number
  }

  const leftIsKnockout = left.match_number >= 73
  const rightIsKnockout = right.match_number >= 73

  if (leftIsKnockout && rightIsKnockout) {
    return (
      new Date(right.kickoff_at).getTime() -
        new Date(left.kickoff_at).getTime() ||
      right.match_number - left.match_number
    )
  }

  if (leftIsKnockout !== rightIsKnockout) {
    return leftIsKnockout ? -1 : 1
  }

  return right.match_number - left.match_number
}

const rankingViews: Record<
  RankingView,
  { eyebrow: string; title: string; description: string }
> = {
  overall: {
    eyebrow: 'CLASSIFICAÇÃO',
    title: 'Ranking geral',
    description: 'Soma todos os pontos do Bolasso 2026.',
  },
  knockout: {
    eyebrow: 'MATA-MATA',
    title: 'Ranking do mata-mata',
    description: 'Conta somente os pontos a partir dos 16 avos de final.',
  },
  groups: {
    eyebrow: 'FASE DE GRUPOS',
    title: 'Ranking da fase de grupos',
    description: 'A fotografia final da primeira fase, com direito a pódio.',
  },
}

function RankingPodium({
  ariaLabel,
  rows,
  variant,
}: {
  ariaLabel: string
  rows: RankingRow[]
  variant?: 'grand'
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={`group-podium ranking-podium ${
        variant === 'grand' ? 'grand-podium' : ''
      }`}
    >
      <div className="podium-glow" aria-hidden="true">
        <Trophy size={variant === 'grand' ? 78 : 58} />
      </div>
      {rows.map((row, index) => (
        <article
          className={`podium-place podium-place-${index + 1}`}
          key={row.user_id}
        >
          <span>{index + 1}º</span>
          <ProfileAvatar
            avatarKey={row.avatar_key}
            displayName={row.display_name}
            size="small"
          />
          <strong>{row.display_name}</strong>
          <small>{row.total_points} pts</small>
        </article>
      ))}
    </div>
  )
}

export function Ranking({
  rows,
  groupRows,
  knockoutRows,
  currentUserId,
  finalPublished,
}: Props) {
  const [activeView, setActiveView] = useState<RankingView>('overall')
  const [selectedParticipant, setSelectedParticipant] =
    useState<RankingRow | null>(null)
  const [participantPredictions, setParticipantPredictions] = useState<
    ParticipantPrediction[]
  >([])
  const [loadingPredictions, setLoadingPredictions] = useState(false)
  const [predictionsError, setPredictionsError] = useState('')
  const predictionsPanelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!selectedParticipant) return

    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      predictionsPanelRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedParticipant])

  async function showPredictions(participant: RankingRow) {
    if (!supabase) return

    setSelectedParticipant(participant)
    setParticipantPredictions([])
    setPredictionsError('')
    setLoadingPredictions(true)

    const { data, error } = await supabase.rpc('get_participant_predictions', {
      target_user_id: participant.user_id,
    })

    setLoadingPredictions(false)
    setPredictionsError(error?.message ?? '')
    if (data) setParticipantPredictions(data)
  }

  function movementLabel(change: number) {
    if (change > 0) return `Subiu ${change} ${change === 1 ? 'posição' : 'posições'}`
    if (change < 0) {
      const positions = Math.abs(change)
      return `Desceu ${positions} ${positions === 1 ? 'posição' : 'posições'}`
    }
    return 'Permaneceu na mesma posição'
  }

  const activeRows =
    activeView === 'groups'
      ? groupRows
      : activeView === 'knockout'
        ? knockoutRows
        : rows
  const activeCopy = rankingViews[activeView]
  const podiumRows =
    activeView === 'overall'
      ? rows.slice(0, 3)
      : activeView === 'knockout'
        ? knockoutRows.slice(0, 3)
        : groupRows.slice(0, 3)
  const showPodium =
    activeView === 'groups' ||
    (finalPublished && (activeView === 'overall' || activeView === 'knockout'))
  const showMovement = activeView !== 'groups'
  const participantPredictionsForActiveView = participantPredictions
    .filter((prediction) => {
      if (activeView === 'groups') return prediction.match_number <= 72
      if (activeView === 'knockout') return prediction.match_number >= 73
      return true
    })
    .sort((left, right) =>
      compareParticipantPredictions(left, right, activeView),
    )
  const predictionScopeLabel =
    activeView === 'groups'
      ? 'da fase de grupos'
      : activeView === 'knockout'
        ? 'do mata-mata'
        : 'do Bolasso'

  return (
    <div className="ranking-page">
      <section className="ranking-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{activeCopy.eyebrow}</span>
            <h2>{activeCopy.title}</h2>
            <p>{activeCopy.description}</p>
          </div>
          <Medal size={28} />
        </div>

        <div className="ranking-tabs" role="tablist" aria-label="Rankings do Bolasso">
          <button
            aria-selected={activeView === 'overall'}
            className={activeView === 'overall' ? 'active' : ''}
            onClick={() => setActiveView('overall')}
            role="tab"
            type="button"
          >
            Geral
          </button>
          <button
            aria-selected={activeView === 'knockout'}
            className={activeView === 'knockout' ? 'active' : ''}
            onClick={() => setActiveView('knockout')}
            role="tab"
            type="button"
          >
            Mata-mata
          </button>
          <button
            aria-selected={activeView === 'groups'}
            className={activeView === 'groups' ? 'active' : ''}
            onClick={() => setActiveView('groups')}
            role="tab"
            type="button"
          >
            Grupos
          </button>
        </div>

        {showPodium && podiumRows.length > 0 && (
          <RankingPodium
            ariaLabel={
              activeView === 'overall'
                ? 'Pódio do ranking geral'
                : activeView === 'knockout'
                  ? 'Pódio do mata-mata'
                  : 'Pódio da fase de grupos'
            }
            rows={podiumRows}
            variant={activeView === 'overall' ? 'grand' : undefined}
          />
        )}

        {activeRows.length === 0 ? (
          <p className="ranking-empty-state">
            Esse ranking ainda não tem dados para exibir.
          </p>
        ) : (
          <div className="ranking-list">
            {activeRows.map((row) => (
              <button
                aria-label={`Ver palpites de ${row.display_name}`}
                className={`ranking-row ${
                  row.user_id === currentUserId ? 'current-user' : ''
                }`}
                key={row.user_id}
                onClick={() => showPredictions(row)}
                type="button"
              >
                <span className="ranking-position">
                  <span
                    className={`position position-${row.ranking_position}`}
                    title={
                      row.is_tied
                        ? 'Posição compartilhada: todos os critérios estão empatados'
                        : undefined
                    }
                  >
                    {row.ranking_position}
                    {row.is_tied && <sup>*</sup>}
                  </span>
                  {showMovement && (
                    <span
                      aria-label={movementLabel(row.position_change)}
                      className={`ranking-movement ${
                        row.position_change > 0
                          ? 'up'
                          : row.position_change < 0
                            ? 'down'
                            : 'same'
                      }`}
                      title={movementLabel(row.position_change)}
                    >
                      {row.position_change > 0 ? (
                        <ArrowUp size={13} strokeWidth={3} />
                      ) : row.position_change < 0 ? (
                        <ArrowDown size={13} strokeWidth={3} />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </span>
                  )}
                </span>
                <ProfileAvatar
                  avatarKey={row.avatar_key}
                  displayName={row.display_name}
                />
                <div className="ranking-name">
                  <strong>{row.display_name}</strong>
                  <small>
                    {row.exact_scores} placares exatos · {row.predictions_count} palpites
                  </small>
                </div>
                <strong className="ranking-points">{row.total_points} pts</strong>
                <Eye className="ranking-eye" size={18} />
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedParticipant && (
        <section
          className="participant-predictions-card"
          ref={predictionsPanelRef}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">PALPITES LIBERADOS</span>
              <h2>{selectedParticipant.display_name}</h2>
            </div>
            <button
              aria-label="Fechar palpites do participante"
              className="close-predictions"
              onClick={() => setSelectedParticipant(null)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <p className="predictions-privacy-note">
            Apenas palpites {predictionScopeLabel} cujo prazo já encerrou são
            exibidos.
          </p>

          {loadingPredictions ? (
            <div className="predictions-loading">
              <LoaderCircle className="spin" size={22} />
              Carregando palpites...
            </div>
          ) : predictionsError ? (
            <p className="form-message error">{predictionsError}</p>
          ) : participantPredictionsForActiveView.length === 0 ? (
            <p className="empty-predictions">
              Nenhum palpite liberado até o momento.
            </p>
          ) : (
            <div className="participant-predictions-list">
              {participantPredictionsForActiveView.map((prediction) => {
                const qualifierPick = prediction.predicted_qualifier
                  ? {
                      flag:
                        prediction.predicted_qualifier === 'home'
                          ? prediction.home_flag
                          : prediction.away_flag,
                      team:
                        prediction.predicted_qualifier === 'home'
                          ? prediction.home_team
                          : prediction.away_team,
                    }
                  : null
                const actualQualifier =
                  prediction.status === 'finished' &&
                  prediction.final_home_score !== null &&
                  prediction.final_away_score !== null &&
                  prediction.final_home_score === prediction.final_away_score &&
                  prediction.final_home_penalty_score !== null &&
                  prediction.final_away_penalty_score !== null
                    ? prediction.final_home_penalty_score >
                      prediction.final_away_penalty_score
                      ? prediction.home_team
                      : prediction.away_team
                    : null

                return (
                  <article
                    className="participant-prediction"
                    key={prediction.match_id}
                  >
                    <span className="prediction-match-number">
                      Jogo {prediction.match_number}
                    </span>
                    <div className="participant-prediction-score">
                      <span>
                        <TeamFlag
                          fallback={prediction.home_flag}
                          team={prediction.home_team}
                        />
                        {prediction.home_team}
                      </span>
                      <strong>
                        {prediction.predicted_home_score} ×{' '}
                        {prediction.predicted_away_score}
                      </strong>
                      <span>
                        {prediction.away_team}
                        <TeamFlag
                          fallback={prediction.away_flag}
                          team={prediction.away_team}
                        />
                      </span>
                    </div>
                    {qualifierPick && (
                      <div className="participant-qualifier-pick">
                        <span>Se empatar:</span>
                        <strong>
                          <TeamFlag
                            fallback={qualifierPick.flag}
                            team={qualifierPick.team}
                          />
                          {qualifierPick.team} se classifica
                        </strong>
                      </div>
                    )}
                    <div className="participant-prediction-result">
                      {prediction.status === 'finished' ? (
                        <>
                          <span>
                            Resultado: {prediction.final_home_score} ×{' '}
                            {prediction.final_away_score}
                            {actualQualifier &&
                              ` · ${actualQualifier} se classificou`}
                          </span>
                          <strong>+{prediction.points ?? 0} pts</strong>
                        </>
                      ) : (
                        <span>Aguardando resultado</span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      <section className="scoring-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">COMO FUNCIONA</span>
            <h2>Regras de pontuação</h2>
          </div>
          <Target size={28} />
        </div>

        <div className="scoring-grid">
          <div><strong>7 pts</strong><span>Acertou o placar exato</span></div>
          <div><strong>5 pts</strong><span>Acertou o resultado e os gols de uma seleção</span></div>
          <div><strong>3 pts</strong><span>Acertou quem venceu ou acertou o empate</span></div>
          <div><strong>+2 pts</strong><span>No mata-mata, acertou quem se classifica após empate</span></div>
          <div><strong>1 pt</strong><span>Acertou apenas os gols de uma seleção</span></div>
          <div><strong>0 pts</strong><span>Não acertou nenhuma das condições</span></div>
        </div>

        <p className="scoring-note">
          Vale sempre a maior categoria atingida. Exemplo: palpite 2 × 0 e
          resultado 2 × 1 valem 5 pontos.
        </p>

        <div className="tiebreak-rules">
          <strong>Critérios de desempate</strong>
          <p>
            Em caso de igualdade nos pontos totais, vale primeiro o número de
            placares exatos. Depois, a quantidade de palpites que renderam 5,
            3 e 1 ponto, nessa ordem. Se todos os critérios forem iguais, os
            participantes dividem a mesma posição, indicada por um asterisco.
          </p>
        </div>
      </section>
    </div>
  )
}
