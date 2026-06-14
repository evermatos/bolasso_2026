import { Info, Table2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculateGroupStandings } from '../lib/groupStandings'
import type { Match } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  matches: Match[]
}

export function GroupStandings({ matches }: Props) {
  const groups = useMemo(() => calculateGroupStandings(matches), [matches])
  const [selectedGroup, setSelectedGroup] = useState('Grupo A')

  return (
    <section className="standings-page">
      <div className="standings-header">
        <div>
          <span className="eyebrow">COPA DO MUNDO 2026</span>
          <h1>Tabela dos grupos</h1>
          <p>Classificação recalculada a cada resultado publicado.</p>
        </div>
        <Table2 size={34} />
      </div>

      <div className="group-tabs" role="tablist" aria-label="Grupos da Copa">
        {groups.map(({ group }) => (
          <button
            aria-selected={selectedGroup === group}
            className={selectedGroup === group ? 'active' : ''}
            key={group}
            onClick={() => setSelectedGroup(group)}
            role="tab"
            type="button"
          >
            {group.replace('Grupo ', '')}
          </button>
        ))}
      </div>

      {groups
        .filter(({ group }) => group === selectedGroup)
        .map(({ group, rows }) => (
          <div className="group-table-card" key={group}>
            <div className="group-table-title">
              <div>
                <span className="eyebrow">CLASSIFICAÇÃO</span>
                <h2>{group}</h2>
              </div>
              <span>2 primeiros avançam · 8 melhores terceiros também</span>
            </div>

            <div className="standings-table-wrap">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Seleção</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>GP</th>
                    <th>GC</th>
                    <th>SG</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      className={`${index < 2 ? 'qualified' : ''} ${
                        index === 2 ? 'third-place' : ''
                      }`}
                      key={row.team}
                    >
                      <td className="standing-position">
                        {index + 1}
                        {row.unresolvedTie && (
                          <span title="Posição provisória: ainda depende de fair play ou ranking FIFA">
                            *
                          </span>
                        )}
                      </td>
                      <td>
                        <TeamFlag fallback={row.flag} team={row.team} />
                        <strong>{row.team}</strong>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalsFor}</td>
                      <td>{row.goalsAgainst}</td>
                      <td>{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</td>
                      <td><strong>{row.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

      <div className="standings-note">
        <Info size={18} />
        <p>
          Em igualdade de pontos, o Bolasso aplica confrontos diretos, saldo e
          gols nos confrontos diretos, reaplicação entre os ainda empatados,
          saldo geral e gols gerais. O asterisco indica que a posição ainda
          dependeria de fair play ou do ranking FIFA oficial.
        </p>
      </div>
    </section>
  )
}
