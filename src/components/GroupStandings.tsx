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

type OfficialSlot = {
  matchNumber: number
  round: string
  placeholderA: string
  placeholderB: string
}

type BracketTeam = {
  label: string
  team?: ProjectedTeam
  note?: string
}

const OFFICIAL_KNOCKOUT_SLOTS: OfficialSlot[] = [
  { matchNumber: 73, round: '16 avos', placeholderA: '2A', placeholderB: '2B' },
  { matchNumber: 74, round: '16 avos', placeholderA: '1E', placeholderB: '3ABCDF' },
  { matchNumber: 75, round: '16 avos', placeholderA: '1F', placeholderB: '2C' },
  { matchNumber: 76, round: '16 avos', placeholderA: '1C', placeholderB: '2F' },
  { matchNumber: 77, round: '16 avos', placeholderA: '1I', placeholderB: '3CDFGH' },
  { matchNumber: 78, round: '16 avos', placeholderA: '2E', placeholderB: '2I' },
  { matchNumber: 79, round: '16 avos', placeholderA: '1A', placeholderB: '3CEFHI' },
  { matchNumber: 80, round: '16 avos', placeholderA: '1L', placeholderB: '3EHIJK' },
  { matchNumber: 81, round: '16 avos', placeholderA: '1D', placeholderB: '3BEFIJ' },
  { matchNumber: 82, round: '16 avos', placeholderA: '1G', placeholderB: '3AEHIJ' },
  { matchNumber: 83, round: '16 avos', placeholderA: '2K', placeholderB: '2L' },
  { matchNumber: 84, round: '16 avos', placeholderA: '1H', placeholderB: '2J' },
  { matchNumber: 85, round: '16 avos', placeholderA: '1B', placeholderB: '3EFGIJ' },
  { matchNumber: 86, round: '16 avos', placeholderA: '1J', placeholderB: '2H' },
  { matchNumber: 87, round: '16 avos', placeholderA: '1K', placeholderB: '3DEIJL' },
  { matchNumber: 88, round: '16 avos', placeholderA: '2D', placeholderB: '2G' },
  { matchNumber: 89, round: 'Oitavas', placeholderA: 'W74', placeholderB: 'W77' },
  { matchNumber: 90, round: 'Oitavas', placeholderA: 'W73', placeholderB: 'W75' },
  { matchNumber: 91, round: 'Oitavas', placeholderA: 'W76', placeholderB: 'W78' },
  { matchNumber: 92, round: 'Oitavas', placeholderA: 'W79', placeholderB: 'W80' },
  { matchNumber: 93, round: 'Oitavas', placeholderA: 'W83', placeholderB: 'W84' },
  { matchNumber: 94, round: 'Oitavas', placeholderA: 'W81', placeholderB: 'W82' },
  { matchNumber: 95, round: 'Oitavas', placeholderA: 'W86', placeholderB: 'W88' },
  { matchNumber: 96, round: 'Oitavas', placeholderA: 'W85', placeholderB: 'W87' },
  { matchNumber: 97, round: 'Quartas', placeholderA: 'W89', placeholderB: 'W90' },
  { matchNumber: 98, round: 'Quartas', placeholderA: 'W93', placeholderB: 'W94' },
  { matchNumber: 99, round: 'Quartas', placeholderA: 'W91', placeholderB: 'W92' },
  { matchNumber: 100, round: 'Quartas', placeholderA: 'W95', placeholderB: 'W96' },
  { matchNumber: 101, round: 'Semis', placeholderA: 'W97', placeholderB: 'W98' },
  { matchNumber: 102, round: 'Semis', placeholderA: 'W99', placeholderB: 'W100' },
  { matchNumber: 103, round: '3º lugar', placeholderA: 'RU101', placeholderB: 'RU102' },
  { matchNumber: 104, round: 'Final', placeholderA: 'W101', placeholderB: 'W102' },
]

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

function teamByGroupPosition(groups: GroupStanding[], groupLetter: string, position: number) {
  const group = groups.find((candidate) => candidate.group === `Grupo ${groupLetter}`)
  const row = group?.rows[position - 1]
  if (!row) return undefined

  return {
    ...row,
    group: `Grupo ${groupLetter}`,
    groupPosition: position,
    seed: 0,
  }
}

function officialThirdLabel(placeholder: string) {
  return `3º ${placeholder.slice(1).split('').join('/')}`
}

function resolveOfficialSlots(groups: GroupStanding[], qualifiedTeams: ProjectedTeam[]) {
  const bestThirds = qualifiedTeams
    .filter((team) => team.groupPosition === 3)
    .sort(compareProjectedTeams)
  const allocatedThirds = new Set<string>()

  function resolvePlaceholder(placeholder: string): BracketTeam {
    const directMatch = placeholder.match(/^([12])([A-L])$/)
    if (directMatch) {
      const team = teamByGroupPosition(
        groups,
        directMatch[2],
        Number(directMatch[1]),
      )

      return {
        label: team ? team.team : placeholder,
        team,
        note: placeholder,
      }
    }

    const thirdMatch = placeholder.match(/^3([A-L]+)$/)
    if (thirdMatch) {
      const allowedGroups = new Set(
        thirdMatch[1].split('').map((letter) => `Grupo ${letter}`),
      )
      const team = bestThirds.find(
        (candidate) =>
          allowedGroups.has(candidate.group) && !allocatedThirds.has(candidate.team),
      )

      if (team) {
        allocatedThirds.add(team.team)
        return {
          label: team.team,
          team,
          note: officialThirdLabel(placeholder),
        }
      }

      return {
        label: officialThirdLabel(placeholder),
        note: 'Slot oficial FIFA',
      }
    }

    if (placeholder.startsWith('W')) {
      return {
        label: `Vencedor Jogo ${placeholder.slice(1)}`,
        note: placeholder,
      }
    }

    if (placeholder.startsWith('RU')) {
      return {
        label: `Perdedor Jogo ${placeholder.slice(2)}`,
        note: placeholder,
      }
    }

    return { label: placeholder }
  }

  return OFFICIAL_KNOCKOUT_SLOTS.map((slot) => ({
    ...slot,
    home: resolvePlaceholder(slot.placeholderA),
    away: resolvePlaceholder(slot.placeholderB),
  }))
}

function groupedOfficialSlots(groups: GroupStanding[], qualifiedTeams: ProjectedTeam[]) {
  const slots = resolveOfficialSlots(groups, qualifiedTeams)
  return [...new Set(slots.map((slot) => slot.round))].map((round) => ({
    round,
    matches: slots.filter((slot) => slot.round === round),
  }))
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
  const knockoutRounds = useMemo(
    () => groupedOfficialSlots(groups, qualifiedTeams),
    [groups, qualifiedTeams],
  )

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
          2 primeiros de cada grupo + 8 melhores terceiros. Os slots e o
          caminho dos vencedores seguem a tabela oficial da FIFA; os terceiros
          colocados são encaixados provisoriamente entre os grupos permitidos
          para cada confronto.
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
          {knockoutRounds.map(({ round, matches }) => (
            <div
              className={`knockout-round ${round !== '16 avos' ? 'muted-round' : ''}`}
              key={round}
            >
              <h3>{round}</h3>
              <div className="knockout-games">
                {matches.map((match) => (
                  <article
                    className={`knockout-game ${
                      round !== '16 avos' ? 'placeholder-game' : ''
                    }`}
                    key={match.matchNumber}
                  >
                    <small className="knockout-match-number">Jogo {match.matchNumber}</small>
                    {[match.home, match.away].map((side) => (
                      <span key={`${match.matchNumber}-${side.label}`}>
                        {side.team ? (
                          <>
                            <small>{side.note}</small>
                            <TeamFlag fallback={side.team.flag} team={side.team.team} />
                            <strong>{side.team.team}</strong>
                          </>
                        ) : (
                          <>
                            <small>{side.note}</small>
                            <strong>{side.label}</strong>
                          </>
                        )}
                      </span>
                    ))}
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
