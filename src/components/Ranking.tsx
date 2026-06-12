import { Eye, LoaderCircle, Medal, Target, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ParticipantPrediction, RankingRow } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  rows: RankingRow[]
  currentUserId?: string
}

export function Ranking({ rows, currentUserId }: Props) {
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

  return (
    <div className="ranking-page">
      <section className="ranking-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CLASSIFICAÇÃO</span>
            <h2>Quem manda nos palpites</h2>
          </div>
          <Medal size={28} />
        </div>

        <div className="ranking-list">
          {rows.map((row, index) => (
            <button
              aria-label={`Ver palpites de ${row.display_name}`}
              className={`ranking-row ${
                row.user_id === currentUserId ? 'current-user' : ''
              }`}
              key={row.user_id}
              onClick={() => showPredictions(row)}
              type="button"
            >
              <span className={`position position-${index + 1}`}>{index + 1}</span>
              <div className="avatar">
                {row.display_name.slice(0, 2).toUpperCase()}
              </div>
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
            Apenas jogos cujo prazo de palpite já encerrou são exibidos.
          </p>

          {loadingPredictions ? (
            <div className="predictions-loading">
              <LoaderCircle className="spin" size={22} />
              Carregando palpites...
            </div>
          ) : predictionsError ? (
            <p className="form-message error">{predictionsError}</p>
          ) : participantPredictions.length === 0 ? (
            <p className="empty-predictions">
              Nenhum palpite liberado até o momento.
            </p>
          ) : (
            <div className="participant-predictions-list">
              {participantPredictions.map((prediction) => (
                <article className="participant-prediction" key={prediction.match_id}>
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
                  <div className="participant-prediction-result">
                    {prediction.status === 'finished' ? (
                      <>
                        <span>
                          Resultado: {prediction.final_home_score} ×{' '}
                          {prediction.final_away_score}
                        </span>
                        <strong>+{prediction.points ?? 0} pts</strong>
                      </>
                    ) : (
                      <span>Aguardando resultado</span>
                    )}
                  </div>
                </article>
              ))}
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
          <div><strong>1 pt</strong><span>Acertou apenas os gols de uma seleção</span></div>
          <div><strong>0 pts</strong><span>Não acertou nenhuma das condições</span></div>
        </div>

        <p className="scoring-note">
          Vale sempre a maior categoria atingida. Exemplo: palpite 2 × 0 e
          resultado 2 × 1 valem 5 pontos.
        </p>
      </section>
    </div>
  )
}
