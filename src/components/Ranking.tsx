import { Medal, Target } from 'lucide-react'
import type { RankingRow } from '../types'

type Props = {
  rows: RankingRow[]
  currentUserId?: string
}

export function Ranking({ rows, currentUserId }: Props) {
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
            <div
              className={`ranking-row ${
                row.user_id === currentUserId ? 'current-user' : ''
              }`}
              key={row.user_id}
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
            </div>
          ))}
        </div>
      </section>

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
