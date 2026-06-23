import { GitBranch, Info, Table2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  calculateGroupStandings,
  type GroupStanding,
  type StandingRow,
} from '../lib/groupStandings'
import type { Match } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  matches: Match[]
}

type ProjectedTeam = StandingRow & {
  group: string
  groupPosition: number
  seed: number
}

function compareProjectedTeams(a: ProjectedTeam, b: ProjectedTeam) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.groupPosition - b.groupPosition ||
    a.team.localeCompare(b.team, 'pt-BR')
  )
}

function projectedQualifiedTeams(groups: GroupStanding[]) {
  const directQualified = groups.flatMap(({ group, rows }) =>
    rows.slice(0, 2).map((row, index) => ({
      ...row,
      group,
      groupPosition: index + 1,
      seed: 0,
    })),
  )

  const bestThirds = groups
    .flatMap(({ group, rows }) => {
      const row = rows[2]
      return row ? [{ ...row, group, groupPosition: 3, seed: 0 }] : []
    })
    .sort(compareProjectedTeams)
    .slice(0, 8)

  return [...directQualified, ...bestThirds]
    .sort(compareProjectedTeams)
    .map((team, index) => ({ ...team, seed: index + 1 }))
}

function pairRoundOf32(teams: ProjectedTeam[]) {
  const pairings = []
  for (let index = 0; index < teams.length / 2; index += 1) {
    pairings.push({
      home: teams[index],
      away: teams[teams.length - 1 - index],
    })
  }
  return pairings
}

function roundPlaceholders(roundSize: number) {
  return Array.from({ length: roundSize }, (_, index) => `Vencedor ${index + 1}`)
}

export function GroupStandings({ matches }: Props) {
  const groups = useMemo(() => calculateGroupStandings(matches), [matches])
  const [selectedGroup, setSelectedGroup] = useState('Grupo A')
  const qualifiedTeams = useMemo(() => projectedQualifiedTeams(groups), [groups])
  const bestThirdTeamNames = useMemo(
    () =>
      new Set(
        qualifiedTeams
          .filter((team) => team.groupPosition === 3)
          .map((team) => team.team),
      ),
    [qualifiedTeams],
  )
  const roundOf32 = useMemo(() => pairRoundOf32(qualifiedTeams), [qualifiedTeams])
  const placeholderRounds = [
    { title: 'Oitavas', teams: roundPlaceholders(8) },
    { title: 'Quartas', teams: roundPlaceholders(4) },
    { title: 'Semis', teams: roundPlaceholders(2) },
    { title: 'Final', teams: roundPlaceholders(1) },
  ]

  return (
    <section className="standings-page">
      <div className="standings-header">
        <div>
          <span className="eyebrow">COPA DO MUNDO 2026</span>
          <h1>Classificação e mata-mata</h1>
          <p>Grupos e projeção de chave recalculados a cada resultado publicado.</p>
        </div>
        <Table2 size={34} />
      </div>

      <div className="standings-note knockout-note">
        <GitBranch size={18} />
        <p>
          O mata-mata abaixo é uma projeção baseada na classificação atual:
          2 primeiros de cada grupo + 8 melhores terceiros. A ordem dos
          confrontos é uma simulação por seed atual, não a chave oficial final
          da FIFA.
        </p>
      </div>

      <section className="knockout-card" aria-labelledby="knockout-title">
        <div className="group-table-title">
          <div>
            <span className="eyebrow">SE ACABASSE AGORA</span>
            <h2 id="knockout-title">Mata-mata projetado</h2>
          </div>
          <span>Terceiros classificados entram apenas se estiverem no top 8</span>
        </div>

        <div className="knockout-bracket">
          <div className="knockout-round">
            <h3>16 avos</h3>
            <div className="knockout-games">
              {roundOf32.map(({ home, away }) => (
                <article className="knockout-game" key={`${home.team}-${away.team}`}>
                  <span>
                    <small>#{home.seed}</small>
                    <TeamFlag fallback={home.flag} team={home.team} />
                    <strong>{home.team}</strong>
                  </span>
                  <span>
                    <small>#{away.seed}</small>
                    <TeamFlag fallback={away.flag} team={away.team} />
                    <strong>{away.team}</strong>
                  </span>
                </article>
              ))}
            </div>
          </div>

          {placeholderRounds.map((round) => (
            <div className="knockout-round muted-round" key={round.title}>
              <h3>{round.title}</h3>
              <div className="knockout-games">
                {round.teams.map((team) => (
                  <article className="knockout-game placeholder-game" key={team}>
                    <span>{team}</span>
                    <span>A definir</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="group-selector">
        <div className="group-selector-heading">
          <strong>Escolha o grupo</strong>
          <span>{selectedGroup}</span>
        </div>
        <div className="group-tabs" role="tablist" aria-label="Grupos da Copa">
          {groups.map(({ group }) => (
            <button
              aria-label={group}
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
              <span>2 primeiros avançam · amarelo = terceiro no top 8 atual</span>
            </div>

            <div className="standings-table-wrap">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Seleção</th>
                    <th>Pts</th>
                    <th>J</th>
                    <th>V</th>
                    <th>E</th>
                    <th>D</th>
                    <th>SG</th>
                    <th>GP</th>
                    <th>GC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      className={`${index < 2 ? 'qualified' : ''} ${
                        index === 2 && bestThirdTeamNames.has(row.team)
                          ? 'third-place'
                          : ''
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
                      <td className="standing-points"><strong>{row.points}</strong></td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</td>
                      <td>{row.goalsFor}</td>
                      <td>{row.goalsAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-standings-list">
              {rows.map((row, index) => (
                <article
                  className={`${index < 2 ? 'qualified' : ''} ${
                    index === 2 && bestThirdTeamNames.has(row.team)
                      ? 'third-place'
                      : ''
                  }`}
                  key={row.team}
                >
                  <div className="mobile-standing-main">
                    <span className="standing-position">
                      {index + 1}
                      {row.unresolvedTie && (
                        <span title="Posição provisória">*</span>
                      )}
                    </span>
                    <span className="mobile-standing-team">
                      <TeamFlag fallback={row.flag} team={row.team} />
                      <strong>{row.team}</strong>
                    </span>
                    <span className="mobile-standing-points">
                      <strong>{row.points}</strong>
                      <small>Pts</small>
                    </span>
                  </div>
                  <div className="mobile-standing-stats">
                    <span><small>J</small><strong>{row.played}</strong></span>
                    <span><small>V</small><strong>{row.won}</strong></span>
                    <span><small>E</small><strong>{row.drawn}</strong></span>
                    <span><small>D</small><strong>{row.lost}</strong></span>
                    <span>
                      <small>SG</small>
                      <strong>
                        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                      </strong>
                    </span>
                    <span><small>GP</small><strong>{row.goalsFor}</strong></span>
                    <span><small>GC</small><strong>{row.goalsAgainst}</strong></span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

      <section className="standings-legend" aria-labelledby="standings-legend-title">
        <div>
          <span className="eyebrow">COMO LER</span>
          <h2 id="standings-legend-title">Legenda da tabela</h2>
        </div>
        <dl>
          <div><dt>Pts</dt><dd>Pontos</dd></div>
          <div><dt>J</dt><dd>Jogos</dd></div>
          <div><dt>V</dt><dd>Vitórias</dd></div>
          <div><dt>E</dt><dd>Empates</dd></div>
          <div><dt>D</dt><dd>Derrotas</dd></div>
          <div><dt>SG</dt><dd>Saldo de gols</dd></div>
          <div><dt>GP</dt><dd>Gols marcados</dd></div>
          <div><dt>GC</dt><dd>Gols sofridos</dd></div>
        </dl>
      </section>

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
