import { Medal } from 'lucide-react'
import type { RankingRow } from '../types'

type Props = {
  rows: RankingRow[]
  currentUserId?: string
}

export function Ranking({ rows, currentUserId }: Props) {
  return (
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
  )
}
