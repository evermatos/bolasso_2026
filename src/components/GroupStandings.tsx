import { CalendarClock, GitBranch, Info, MapPin, Table2, X } from 'lucide-react'
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
  placeholder: string
  team?: ProjectedTeam
  note?: string
  confirmed: boolean
}

type ResolvedOfficialSlot = OfficialSlot & {
  home: BracketTeam
  away: BracketTeam
  kickoffAt?: string
  venue?: string
  city?: string
}

type CupView = 'table' | 'knockout'

const TEAM_CODES: Record<string, string> = {
  Alemanha: 'ALE',
  Argentina: 'ARG',
  Argélia: 'ALG',
  'Arábia Saudita': 'SAU',
  Austrália: 'AUS',
  Áustria: 'AUT',
  Bélgica: 'BEL',
  'Bósnia e Herzegovina': 'BIH',
  Brasil: 'BRA',
  'Cabo Verde': 'CPV',
  Canadá: 'CAN',
  Catar: 'QAT',
  Colômbia: 'COL',
  'Coreia do Sul': 'KOR',
  'Costa do Marfim': 'CIV',
  Croácia: 'CRO',
  Curaçao: 'CUW',
  Egito: 'EGY',
  Equador: 'ECU',
  Escócia: 'SCO',
  Espanha: 'ESP',
  'Estados Unidos': 'USA',
  França: 'FRA',
  Gana: 'GHA',
  Haiti: 'HAI',
  Inglaterra: 'ENG',
  Iraque: 'IRQ',
  Irã: 'IRN',
  Japão: 'JPN',
  Jordânia: 'JOR',
  Marrocos: 'MAR',
  México: 'MEX',
  Noruega: 'NOR',
  'Nova Zelândia': 'NZL',
  Panamá: 'PAN',
  Paraguai: 'PAR',
  'Países Baixos': 'NED',
  Portugal: 'POR',
  'RD Congo': 'COD',
  Senegal: 'SEN',
  Suécia: 'SWE',
  Suíça: 'SUI',
  Tchéquia: 'CZE',
  Tunísia: 'TUN',
  Turquia: 'TUR',
  Uruguai: 'URU',
  Uzbequistão: 'UZB',
  'África do Sul': 'RSA',
}

const KNOCKOUT_MATCH_DETAILS: Record<
  number,
  { kickoffAt: string; venue: string; city: string }
> = {
  73: { kickoffAt: '2026-06-28T19:00:00Z', venue: 'Los Angeles Stadium', city: 'Los Angeles' },
  74: { kickoffAt: '2026-06-29T20:30:00Z', venue: 'Boston Stadium', city: 'Boston' },
  75: { kickoffAt: '2026-06-30T01:00:00Z', venue: 'Monterrey Stadium', city: 'Monterrey' },
  76: { kickoffAt: '2026-06-29T17:00:00Z', venue: 'Houston Stadium', city: 'Houston' },
  77: { kickoffAt: '2026-06-30T21:00:00Z', venue: 'New York/New Jersey Stadium', city: 'New Jersey' },
  78: { kickoffAt: '2026-06-30T17:00:00Z', venue: 'Dallas Stadium', city: 'Dallas' },
  79: { kickoffAt: '2026-07-01T01:00:00Z', venue: 'Mexico City Stadium', city: 'Mexico City' },
  80: { kickoffAt: '2026-07-01T16:00:00Z', venue: 'Atlanta Stadium', city: 'Atlanta' },
  81: { kickoffAt: '2026-07-02T00:00:00Z', venue: 'San Francisco Bay Area Stadium', city: 'San Francisco Bay Area' },
  82: { kickoffAt: '2026-07-01T20:00:00Z', venue: 'Seattle Stadium', city: 'Seattle' },
  83: { kickoffAt: '2026-07-02T23:00:00Z', venue: 'Toronto Stadium', city: 'Toronto' },
  84: { kickoffAt: '2026-07-02T19:00:00Z', venue: 'Los Angeles Stadium', city: 'Los Angeles' },
  85: { kickoffAt: '2026-07-03T03:00:00Z', venue: 'BC Place Vancouver', city: 'Vancouver' },
  86: { kickoffAt: '2026-07-03T22:00:00Z', venue: 'Miami Stadium', city: 'Miami' },
  87: { kickoffAt: '2026-07-04T01:30:00Z', venue: 'Kansas City Stadium', city: 'Kansas City' },
  88: { kickoffAt: '2026-07-03T18:00:00Z', venue: 'Dallas Stadium', city: 'Dallas' },
  89: { kickoffAt: '2026-07-04T21:00:00Z', venue: 'Philadelphia Stadium', city: 'Philadelphia' },
  90: { kickoffAt: '2026-07-04T17:00:00Z', venue: 'Houston Stadium', city: 'Houston' },
  91: { kickoffAt: '2026-07-05T20:00:00Z', venue: 'New York/New Jersey Stadium', city: 'New Jersey' },
  92: { kickoffAt: '2026-07-06T00:00:00Z', venue: 'Mexico City Stadium', city: 'Mexico City' },
  93: { kickoffAt: '2026-07-06T19:00:00Z', venue: 'Dallas Stadium', city: 'Dallas' },
  94: { kickoffAt: '2026-07-07T00:00:00Z', venue: 'Seattle Stadium', city: 'Seattle' },
  95: { kickoffAt: '2026-07-07T16:00:00Z', venue: 'Atlanta Stadium', city: 'Atlanta' },
  96: { kickoffAt: '2026-07-07T20:00:00Z', venue: 'BC Place Vancouver', city: 'Vancouver' },
  97: { kickoffAt: '2026-07-09T20:00:00Z', venue: 'Boston Stadium', city: 'Boston' },
  98: { kickoffAt: '2026-07-10T19:00:00Z', venue: 'Los Angeles Stadium', city: 'Los Angeles' },
  99: { kickoffAt: '2026-07-11T21:00:00Z', venue: 'Miami Stadium', city: 'Miami' },
  100: { kickoffAt: '2026-07-12T01:00:00Z', venue: 'Kansas City Stadium', city: 'Kansas City' },
  101: { kickoffAt: '2026-07-14T19:00:00Z', venue: 'Dallas Stadium', city: 'Dallas' },
  102: { kickoffAt: '2026-07-15T19:00:00Z', venue: 'Atlanta Stadium', city: 'Atlanta' },
  103: { kickoffAt: '2026-07-18T21:00:00Z', venue: 'Miami Stadium', city: 'Miami' },
  104: { kickoffAt: '2026-07-19T19:00:00Z', venue: 'New York/New Jersey Stadium', city: 'New Jersey' },
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

function normalizeTeamName(team: string) {
  return team
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
}

function teamCode(team: string) {
  return TEAM_CODES[team] ?? normalizeTeamName(team).slice(0, 3).toUpperCase()
}

function formatKnockoutDate(kickoffAt?: string) {
  if (!kickoffAt) return 'Horário a definir'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai',
  }).format(new Date(kickoffAt))
}

function sideFullName(side: BracketTeam) {
  if (side.confirmed && side.team) return side.team.team
  if (side.placeholder.startsWith('W')) return `Vencedor do jogo ${side.placeholder.slice(1)}`
  if (side.placeholder.startsWith('RU')) return `Perdedor do jogo ${side.placeholder.slice(2)}`

  return `Slot oficial: ${side.label}`
}

function thirdPlaceholderKey(matchNumber: number, placeholder: string) {
  return `${matchNumber}:${placeholder}`
}

function allowedThirdGroups(placeholder: string) {
  const match = placeholder.match(/^3([A-L]+)$/)
  if (!match) return null

  return new Set(match[1].split('').map((letter) => `Grupo ${letter}`))
}

function allocateThirdsToOfficialSlots(bestThirds: ProjectedTeam[]) {
  const thirdSlots = OFFICIAL_KNOCKOUT_SLOTS
    .filter(
      (slot) =>
        slot.round === '16 avos' &&
        (slot.placeholderA.startsWith('3') || slot.placeholderB.startsWith('3')),
    )
    .map((slot) => {
      const placeholder = slot.placeholderA.startsWith('3')
        ? slot.placeholderA
        : slot.placeholderB
      const allowedGroups = allowedThirdGroups(placeholder) ?? new Set<string>()
      const candidates = bestThirds.filter((team) => allowedGroups.has(team.group))

      return {
        key: thirdPlaceholderKey(slot.matchNumber, placeholder),
        candidates,
      }
    })
    .sort((a, b) => a.candidates.length - b.candidates.length)

  function solve(
    slotIndex: number,
    usedTeams: Set<string>,
    allocation: Map<string, ProjectedTeam>,
  ): Map<string, ProjectedTeam> | null {
    if (slotIndex === thirdSlots.length) return allocation

    const slot = thirdSlots[slotIndex]
    for (const candidate of slot.candidates) {
      if (usedTeams.has(candidate.team)) continue

      const nextUsedTeams = new Set(usedTeams)
      const nextAllocation = new Map(allocation)
      nextUsedTeams.add(candidate.team)
      nextAllocation.set(slot.key, candidate)

      const solved = solve(slotIndex + 1, nextUsedTeams, nextAllocation)
      if (solved) return solved
    }

    return null
  }

  return solve(0, new Set(), new Map()) ?? new Map<string, ProjectedTeam>()
}

function resolveOfficialSlots(
  groups: GroupStanding[],
  qualifiedTeams: ProjectedTeam[],
  completedGroups: Set<string>,
) {
  const bestThirds = qualifiedTeams
    .filter((team) => team.groupPosition === 3)
    .sort(compareProjectedTeams)
  const thirdAllocation = allocateThirdsToOfficialSlots(bestThirds)
  const allGroupsCompleted = groups.every(({ group }) => completedGroups.has(group))

  function isConfirmed(team: ProjectedTeam | undefined) {
    return Boolean(team && completedGroups.has(team.group) && !team.unresolvedTie)
  }

  function resolvePlaceholder(matchNumber: number, placeholder: string): BracketTeam {
    const directMatch = placeholder.match(/^([12])([A-L])$/)
    if (directMatch) {
      const team = teamByGroupPosition(
        groups,
        directMatch[2],
        Number(directMatch[1]),
      )

      return {
        label: team && isConfirmed(team) ? team.team : placeholder,
        placeholder,
        team: isConfirmed(team) ? team : undefined,
        note: placeholder,
        confirmed: isConfirmed(team),
      }
    }

    const thirdMatch = placeholder.match(/^3([A-L]+)$/)
    if (thirdMatch) {
      const team = thirdAllocation.get(thirdPlaceholderKey(matchNumber, placeholder))

      if (team && allGroupsCompleted && isConfirmed(team)) {
        return {
          label: team.team,
          placeholder,
          team,
          note: officialThirdLabel(placeholder),
          confirmed: true,
        }
      }

      return {
        label: officialThirdLabel(placeholder),
        placeholder,
        note: 'Slot oficial FIFA',
        confirmed: false,
      }
    }

    if (placeholder.startsWith('W')) {
      return {
        label: placeholder,
        placeholder,
        note: `Vencedor do jogo ${placeholder.slice(1)}`,
        confirmed: false,
      }
    }

    if (placeholder.startsWith('RU')) {
      return {
        label: placeholder,
        placeholder,
        note: `Perdedor do jogo ${placeholder.slice(2)}`,
        confirmed: false,
      }
    }

    return { label: placeholder, placeholder, confirmed: false }
  }

  return OFFICIAL_KNOCKOUT_SLOTS.map((slot) => {
    const details = KNOCKOUT_MATCH_DETAILS[slot.matchNumber]

    return {
      ...slot,
      ...details,
      home: resolvePlaceholder(slot.matchNumber, slot.placeholderA),
      away: resolvePlaceholder(slot.matchNumber, slot.placeholderB),
    }
  })
}

function matchesByNumber(slots: ResolvedOfficialSlot[], numbers: number[]) {
  return numbers
    .map((number) => slots.find((slot) => slot.matchNumber === number))
    .filter((slot): slot is ResolvedOfficialSlot => Boolean(slot))
}

function BracketColumn({
  matches,
  onSelect,
  title,
}: {
  matches: ResolvedOfficialSlot[]
  onSelect: (match: ResolvedOfficialSlot) => void
  title: string
}) {
  return (
    <div className={`knockout-round knockout-round-${matches.length}`}>
      <h3>{title}</h3>
      <div className="knockout-games">
        {matches.map((match) => (
          <button
            aria-label={`Ver detalhes do jogo ${match.matchNumber}`}
            className={`knockout-game ${
              match.round !== '16 avos' ? 'placeholder-game' : ''
            }`}
            key={match.matchNumber}
            onClick={() => onSelect(match)}
            type="button"
          >
            <small className="knockout-match-number">Jogo {match.matchNumber}</small>
            {[match.home, match.away].map((side) => (
              <span key={`${match.matchNumber}-${side.placeholder}`}>
                {side.confirmed && side.team ? (
                  <>
                    <TeamFlag fallback={side.team.flag} team={side.team.team} />
                    <strong>{teamCode(side.team.team)}</strong>
                  </>
                ) : (
                  <>
                    <strong>{side.label}</strong>
                  </>
                )}
              </span>
            ))}
          </button>
        ))}
      </div>
    </div>
  )
}

function KnockoutMatchModal({
  match,
  onClose,
}: {
  match: ResolvedOfficialSlot
  onClose: () => void
}) {
  return (
    <div aria-modal="true" className="knockout-modal-shell" role="dialog">
      <button
        aria-label="Fechar detalhes do jogo"
        className="group-info-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="knockout-modal">
        <header>
          <div>
            <span className="eyebrow">{match.round}</span>
            <h2>Jogo {match.matchNumber}</h2>
          </div>
          <button
            aria-label="Fechar"
            className="group-info-close"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="knockout-modal-teams">
          {[match.home, match.away].map((side) => (
            <div key={side.placeholder}>
              {side.confirmed && side.team ? (
                <TeamFlag fallback={side.team.flag} team={side.team.team} />
              ) : (
                <span className="knockout-slot-chip">{side.placeholder}</span>
              )}
              <strong>{sideFullName(side)}</strong>
              <small>
                {side.confirmed && side.team
                  ? `${side.team.groupPosition}º do ${side.team.group}`
                  : side.note}
              </small>
            </div>
          ))}
        </div>

        <div className="knockout-modal-details">
          <span>
            <CalendarClock size={17} />
            {formatKnockoutDate(match.kickoffAt)} · Abu Dhabi
          </span>
          <span>
            <MapPin size={17} />
            {match.venue && match.city
              ? `${match.venue} · ${match.city}`
              : 'Local a definir'}
          </span>
        </div>
      </section>
    </div>
  )
}

export function GroupStandings({ matches }: Props) {
  const groups = useMemo(() => calculateGroupStandings(matches), [matches])
  const [selectedGroup, setSelectedGroup] = useState('Grupo A')
  const [cupView, setCupView] = useState<CupView>('knockout')
  const [selectedKnockoutMatch, setSelectedKnockoutMatch] =
    useState<ResolvedOfficialSlot | null>(null)
  const completedGroups = useMemo(
    () =>
      new Set(
        groups
          .filter(({ group }) => {
            const groupMatches = matches.filter((match) => match.stage === group)
            return (
              groupMatches.length > 0 &&
              groupMatches.every((match) => match.status === 'finished')
            )
          })
          .map(({ group }) => group),
      ),
    [groups, matches],
  )
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
  const officialSlots = useMemo(
    () => resolveOfficialSlots(groups, qualifiedTeams, completedGroups),
    [completedGroups, groups, qualifiedTeams],
  )
  const leftRoundOf32 = matchesByNumber(officialSlots, [73, 75, 74, 77, 81, 82, 83, 84])
  const rightRoundOf32 = matchesByNumber(officialSlots, [76, 78, 79, 80, 85, 87, 86, 88])
  const leftRoundOf16 = matchesByNumber(officialSlots, [89, 90, 91, 92])
  const rightRoundOf16 = matchesByNumber(officialSlots, [93, 94, 95, 96])
  const leftQuarters = matchesByNumber(officialSlots, [97, 99])
  const rightQuarters = matchesByNumber(officialSlots, [98, 100])
  const leftSemis = matchesByNumber(officialSlots, [101])
  const rightSemis = matchesByNumber(officialSlots, [102])
  const finalMatches = matchesByNumber(officialSlots, [104])
  const thirdPlaceMatches = matchesByNumber(officialSlots, [103])

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

      <div className="cup-view-tabs" role="tablist" aria-label="Visualização da Copa">
        <button
          aria-selected={cupView === 'knockout'}
          className={cupView === 'knockout' ? 'active' : ''}
          onClick={() => setCupView('knockout')}
          role="tab"
          type="button"
        >
          Mata-mata
        </button>
        <button
          aria-selected={cupView === 'table'}
          className={cupView === 'table' ? 'active' : ''}
          onClick={() => setCupView('table')}
          role="tab"
          type="button"
        >
          Tabela
        </button>
      </div>

      {cupView === 'knockout' && (
        <>
          <div className="standings-note knockout-note">
            <GitBranch size={18} />
            <p>
              O mata-mata abaixo é uma projeção baseada na classificação atual:
              2 primeiros de cada grupo + 8 melhores terceiros. Os slots e o
              caminho dos vencedores seguem a tabela oficial da FIFA; os
              terceiros colocados são encaixados provisoriamente entre os
              grupos permitidos para cada confronto.
            </p>
          </div>

          <section className="knockout-card" aria-labelledby="knockout-title">
            <div className="group-table-title">
              <div>
                <span className="eyebrow">SE ACABASSE AGORA</span>
                <h2 id="knockout-title">Mata-mata projetado</h2>
              </div>
              <span>Final no centro · 16 avos divididos nos lados</span>
            </div>

            <div className="knockout-bracket">
              <div className="knockout-side left-side">
                <BracketColumn
                  matches={leftRoundOf32}
                  onSelect={setSelectedKnockoutMatch}
                  title="16 avos"
                />
                <BracketColumn
                  matches={leftRoundOf16}
                  onSelect={setSelectedKnockoutMatch}
                  title="Oitavas"
                />
                <BracketColumn
                  matches={leftQuarters}
                  onSelect={setSelectedKnockoutMatch}
                  title="Quartas"
                />
                <BracketColumn
                  matches={leftSemis}
                  onSelect={setSelectedKnockoutMatch}
                  title="Semi"
                />
              </div>

              <div className="knockout-center">
                <BracketColumn
                  matches={finalMatches}
                  onSelect={setSelectedKnockoutMatch}
                  title="Final"
                />
                <BracketColumn
                  matches={thirdPlaceMatches}
                  onSelect={setSelectedKnockoutMatch}
                  title="3º lugar"
                />
              </div>

              <div className="knockout-side right-side">
                <BracketColumn
                  matches={rightSemis}
                  onSelect={setSelectedKnockoutMatch}
                  title="Semi"
                />
                <BracketColumn
                  matches={rightQuarters}
                  onSelect={setSelectedKnockoutMatch}
                  title="Quartas"
                />
                <BracketColumn
                  matches={rightRoundOf16}
                  onSelect={setSelectedKnockoutMatch}
                  title="Oitavas"
                />
                <BracketColumn
                  matches={rightRoundOf32}
                  onSelect={setSelectedKnockoutMatch}
                  title="16 avos"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {cupView === 'table' && (
        <>
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
              Em igualdade de pontos, o Bolasso aplica confrontos diretos,
              saldo e gols nos confrontos diretos, reaplicação entre os ainda
              empatados, saldo geral e gols gerais. O asterisco indica que a
              posição ainda dependeria de fair play ou do ranking FIFA oficial.
            </p>
          </div>
        </>
      )}

      {selectedKnockoutMatch && (
        <KnockoutMatchModal
          match={selectedKnockoutMatch}
          onClose={() => setSelectedKnockoutMatch(null)}
        />
      )}
    </section>
  )
}
