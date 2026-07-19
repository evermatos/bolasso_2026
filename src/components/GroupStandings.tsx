import { CalendarClock, Info, MapPin, Table2, X } from 'lucide-react'
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
  sourceLabel?: string
  confirmed: boolean
}

type ResolvedOfficialSlot = OfficialSlot & {
  home: BracketTeam
  away: BracketTeam
  kickoffAt?: string
  venue?: string
  city?: string
  liveMatch?: Match
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

const THIRD_PLACE_SLOT_PRIORITY: Record<string, string[]> = {
  '74:3ABCDF': ['D', 'B', 'A', 'C', 'F'],
  '77:3CDFGH': ['F', 'C', 'D', 'G', 'H'],
  '79:3CEFHI': ['E', 'C', 'F', 'H', 'I'],
  '80:3EHIJK': ['K', 'E', 'H', 'I', 'J'],
  '81:3BEFIJ': ['B', 'E', 'F', 'I', 'J'],
  '82:3AEHIJ': ['I', 'A', 'E', 'H', 'J'],
  '85:3EFGIJ': ['J', 'E', 'F', 'G', 'I'],
  '87:3DEIJL': ['L', 'D', 'E', 'I', 'J'],
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

function knockoutTeamLabel(matchNumber: number, team: string) {
  return matchNumber >= 103 ? team : teamCode(team)
}

function knockoutGameTone(matchNumber: number) {
  if (matchNumber === 104) return 'final-knockout-game title-knockout-game'
  if (matchNumber === 103) return 'third-place-knockout-game title-knockout-game'
  return ''
}

function formatKnockoutDate(kickoffAt?: string) {
  if (!kickoffAt) return 'Horário a definir'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Dubai',
  }).format(new Date(kickoffAt))
}

function formatMatchDate(kickoffAt: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dubai',
  }).format(new Date(kickoffAt))
}

function sideFullName(side: BracketTeam) {
  if (side.confirmed && side.team) return side.team.team
  if (side.placeholder.startsWith('W')) return `Vencedor do jogo ${side.placeholder.slice(1)}`
  if (side.placeholder.startsWith('RU')) return `Perdedor do jogo ${side.placeholder.slice(2)}`

  return `Slot oficial: ${side.label}`
}

function sideSourceLabel(side: BracketTeam) {
  return side.sourceLabel ?? (
    side.confirmed && side.team
      ? `${side.team.groupPosition}º do ${side.team.group}`
      : side.note
  )
}

function knockoutTeamScore(match: ResolvedOfficialSlot, side: 'home' | 'away') {
  const liveMatch = match.liveMatch

  if (
    !liveMatch ||
    liveMatch.status !== 'finished' ||
    liveMatch.home_score === null ||
    liveMatch.away_score === null
  ) {
    return null
  }

  const regularScore = side === 'home'
    ? liveMatch.home_score
    : liveMatch.away_score
  const penaltyScore = side === 'home'
    ? liveMatch.home_penalty_score
    : liveMatch.away_penalty_score

  return penaltyScore === null
    ? String(regularScore)
    : `${regularScore} (${penaltyScore})`
}

function formatMatchScore(match: Match) {
  if (
    match.status !== 'finished' ||
    match.home_score === null ||
    match.away_score === null
  ) {
    return '×'
  }

  const regularScore = `${match.home_score} × ${match.away_score}`
  if (
    match.home_penalty_score !== null &&
    match.away_penalty_score !== null
  ) {
    return `${regularScore} · pen. ${match.home_penalty_score} × ${match.away_penalty_score}`
  }

  return regularScore
}

function homeSideAdvanced(match: Match) {
  if (
    match.home_score === null ||
    match.away_score === null ||
    match.status !== 'finished'
  ) {
    return null
  }

  if (match.home_score !== match.away_score) {
    return match.home_score > match.away_score
  }

  if (
    match.home_penalty_score === null ||
    match.away_penalty_score === null ||
    match.home_penalty_score === match.away_penalty_score
  ) {
    return null
  }

  return match.home_penalty_score > match.away_penalty_score
}

function finalChampion(match: Match | undefined) {
  if (!match) return null

  const homeWon = homeSideAdvanced(match)
  if (homeWon === null) return null

  return {
    flag: homeWon ? match.home_flag : match.away_flag,
    team: homeWon ? match.home_team : match.away_team,
  }
}

function thirdPlaceholderKey(matchNumber: number, placeholder: string) {
  return `${matchNumber}:${placeholder}`
}

function groupLetter(group: string) {
  return group.replace('Grupo ', '')
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
      const priority =
        THIRD_PLACE_SLOT_PRIORITY[thirdPlaceholderKey(slot.matchNumber, placeholder)] ??
        []
      const candidates = bestThirds
        .filter((team) => allowedGroups.has(team.group))
        .sort((a, b) => {
          const priorityA = priority.indexOf(groupLetter(a.group))
          const priorityB = priority.indexOf(groupLetter(b.group))

          return (
            (priorityA === -1 ? 99 : priorityA) -
            (priorityB === -1 ? 99 : priorityB)
          )
        })

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
  matches: Match[],
) {
  const bestThirds = qualifiedTeams
    .filter((team) => team.groupPosition === 3)
    .sort(compareProjectedTeams)
  const thirdAllocation = allocateThirdsToOfficialSlots(bestThirds)
  const allGroupsCompleted = groups.every(({ group }) => completedGroups.has(group))
  const liveMatchesByNumber = new Map(
    matches.map((match) => [match.match_number, match]),
  )

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

  const baseSlots = new Map(
    OFFICIAL_KNOCKOUT_SLOTS.map((slot) => {
      const details = KNOCKOUT_MATCH_DETAILS[slot.matchNumber]
      const liveMatch = liveMatchesByNumber.get(slot.matchNumber)

      return [
        slot.matchNumber,
        {
          ...slot,
          ...details,
          liveMatch,
          home: resolvePlaceholder(slot.matchNumber, slot.placeholderA),
          away: resolvePlaceholder(slot.matchNumber, slot.placeholderB),
        },
      ] as const
    }),
  )

  function resolveProgressionPlaceholder(
    placeholder: string,
    visitedMatches = new Set<number>(),
  ): BracketTeam {
    const winnerMatch = placeholder.match(/^W(\d+)$/)
    const runnerUpMatch = placeholder.match(/^RU(\d+)$/)
    const sourceMatchNumber = Number(winnerMatch?.[1] ?? runnerUpMatch?.[1])

    if (!sourceMatchNumber || visitedMatches.has(sourceMatchNumber)) {
      return { label: placeholder, placeholder, note: placeholder, confirmed: false }
    }

    const sourceSlot = baseSlots.get(sourceMatchNumber)
    const sourceLiveMatch = liveMatchesByNumber.get(sourceMatchNumber)
    if (
      !sourceSlot ||
      sourceLiveMatch?.status !== 'finished' ||
      sourceLiveMatch.home_score === null ||
      sourceLiveMatch.away_score === null
    ) {
      return {
        label: placeholder,
        placeholder,
        note: winnerMatch
          ? `Vencedor do jogo ${sourceMatchNumber}`
          : `Perdedor do jogo ${sourceMatchNumber}`,
        confirmed: false,
      }
    }

    const homeWon = homeSideAdvanced(sourceLiveMatch)
    if (homeWon === null) {
      return {
        label: placeholder,
        placeholder,
        note: winnerMatch
          ? `Vencedor do jogo ${sourceMatchNumber}`
          : `Perdedor do jogo ${sourceMatchNumber}`,
        confirmed: false,
      }
    }

    const nextVisitedMatches = new Set(visitedMatches)
    nextVisitedMatches.add(sourceMatchNumber)
    const side = winnerMatch
      ? homeWon ? sourceSlot.home : sourceSlot.away
      : homeWon ? sourceSlot.away : sourceSlot.home

    const resolvedSide = resolveBracketTeam(side, nextVisitedMatches)

    return {
      ...resolvedSide,
      sourceLabel: winnerMatch
        ? `Vencedor do jogo ${sourceMatchNumber}`
        : `Perdedor do jogo ${sourceMatchNumber}`,
    }
  }

  function resolveBracketTeam(
    side: BracketTeam,
    visitedMatches = new Set<number>(),
  ): BracketTeam {
    if (side.placeholder.startsWith('W') || side.placeholder.startsWith('RU')) {
      return resolveProgressionPlaceholder(side.placeholder, visitedMatches)
    }

    return side
  }

  return Array.from(baseSlots.values()).map((slot) => {
    const details = KNOCKOUT_MATCH_DETAILS[slot.matchNumber]

    return {
      ...slot,
      ...details,
      home: resolveBracketTeam(slot.home),
      away: resolveBracketTeam(slot.away),
    }
  })
}

function matchesByNumber(slots: ResolvedOfficialSlot[], numbers: number[]) {
  return numbers
    .map((number) => slots.find((slot) => slot.matchNumber === number))
    .filter((slot): slot is ResolvedOfficialSlot => Boolean(slot))
}

const BRACKET_TRACK_BY_MATCH: Record<number, number> = {
  73: 1,
  75: 3,
  74: 5,
  77: 7,
  82: 9,
  81: 11,
  84: 13,
  83: 15,
  90: 2,
  89: 6,
  94: 10,
  93: 14,
  97: 4,
  98: 12,
  101: 8,
  76: 1,
  78: 3,
  79: 5,
  80: 7,
  85: 9,
  87: 11,
  88: 13,
  86: 15,
  91: 2,
  92: 6,
  96: 10,
  95: 14,
  99: 4,
  100: 12,
  102: 8,
}

const LEFT_CONNECTOR_PAIRS = [
  { from: [73, 75], to: 90 },
  { from: [74, 77], to: 89 },
  { from: [82, 81], to: 94 },
  { from: [84, 83], to: 93 },
  { from: [90, 89], to: 97 },
  { from: [94, 93], to: 98 },
  { from: [97, 98], to: 101 },
]

const RIGHT_CONNECTOR_PAIRS = [
  { from: [76, 78], to: 91 },
  { from: [79, 80], to: 92 },
  { from: [85, 87], to: 96 },
  { from: [88, 86], to: 95 },
  { from: [91, 92], to: 99 },
  { from: [96, 95], to: 100 },
  { from: [99, 100], to: 102 },
]

function bracketGridRow(matchNumber: number) {
  return BRACKET_TRACK_BY_MATCH[matchNumber] ?? 'auto'
}

function connectorColumn(matchNumber: number, side: 'left' | 'right') {
  const round = OFFICIAL_KNOCKOUT_SLOTS.find(
    (slot) => slot.matchNumber === matchNumber,
  )?.round

  if (side === 'left') {
    if (round === '16 avos') return 0
    if (round === 'Oitavas') return 1
    if (round === 'Quartas') return 2
    return 3
  }

  if (round === '16 avos') return 3
  if (round === 'Oitavas') return 2
  if (round === 'Quartas') return 1
  return 0
}

function BracketConnectors({ side }: { side: 'left' | 'right' }) {
  const pairs = side === 'left' ? LEFT_CONNECTOR_PAIRS : RIGHT_CONNECTOR_PAIRS
  const columnWidth = 112
  const columnGap = 8
  const rowHeight = 54

  function rowY(matchNumber: number) {
    return ((BRACKET_TRACK_BY_MATCH[matchNumber] ?? 1) - 0.5) * rowHeight
  }

  function edgeX(matchNumber: number, edge: 'from' | 'to') {
    const column = connectorColumn(matchNumber, side)
    const start = column * (columnWidth + columnGap)
    const end = start + columnWidth

    if (side === 'left') return edge === 'from' ? end : start
    return edge === 'from' ? start : end
  }

  return (
    <svg
      aria-hidden="true"
      className={`knockout-connectors knockout-connectors-${side}`}
      focusable="false"
      viewBox="0 0 472 864"
    >
      {pairs.map(({ from, to }) => {
        const [first, second] = from
        const firstY = rowY(first)
        const secondY = rowY(second)
        const targetY = rowY(to)
        const firstX = edgeX(first, 'from')
        const secondX = edgeX(second, 'from')
        const targetX = edgeX(to, 'to')
        const targetInsetX = side === 'left' ? targetX - 3 : targetX + 3
        const trunkX =
          side === 'left'
            ? Math.min(firstX, targetX) + columnGap / 2
            : Math.max(firstX, targetX) - columnGap / 2

        return (
          <g key={`${first}-${second}-${to}`}>
            <path d={`M ${firstX} ${firstY} H ${trunkX}`} />
            <path d={`M ${secondX} ${secondY} H ${trunkX}`} />
            <path d={`M ${trunkX} ${firstY} V ${secondY}`} />
            <path d={`M ${trunkX} ${targetY} H ${targetInsetX}`} />
          </g>
        )
      })}
    </svg>
  )
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
        {matches.map((match) => {
          const hasBothTeams = match.home.confirmed && match.away.confirmed
          const hasBrazil =
            match.home.team?.team === 'Brasil' || match.away.team?.team === 'Brasil'

          return (
            <button
              aria-label={`Ver detalhes do jogo ${match.matchNumber}`}
              className={`knockout-game ${
                match.round !== '16 avos' && !hasBothTeams ? 'placeholder-game' : ''
              } ${hasBothTeams ? 'confirmed-game' : ''} ${
                hasBrazil ? 'brazil-knockout-game' : ''
              } ${
                knockoutGameTone(match.matchNumber)
              }`}
              key={match.matchNumber}
              onClick={() => onSelect(match)}
              style={{ gridRow: bracketGridRow(match.matchNumber) }}
              type="button"
            >
              <small className="knockout-match-number">
                Jogo {match.matchNumber}
              </small>
              {[
                { key: 'home' as const, team: match.home },
                { key: 'away' as const, team: match.away },
              ].map((side) => {
                const score = knockoutTeamScore(match, side.key)

                return (
                  <span key={`${match.matchNumber}-${side.team.placeholder}`}>
                    {side.team.confirmed && side.team.team ? (
                      <>
                        <TeamFlag
                          fallback={side.team.team.flag}
                          team={side.team.team.team}
                        />
                        <strong>
                          {knockoutTeamLabel(match.matchNumber, side.team.team.team)}
                        </strong>
                      </>
                    ) : (
                      <>
                        <strong>{side.team.label}</strong>
                      </>
                    )}
                    {score !== null && (
                      <b className="knockout-game-score">{score}</b>
                    )}
                  </span>
                )
              })}
            </button>
          )
        })}
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
  const resultLabel = match.liveMatch ? formatMatchScore(match.liveMatch) : null
  const hasResult = resultLabel !== null && resultLabel !== '×'

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
              <small>{sideSourceLabel(side)}</small>
            </div>
          ))}
        </div>

        {hasResult && (
          <div className="knockout-modal-result">
            <span>Resultado</span>
            <strong>{resultLabel}</strong>
          </div>
        )}

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
    () => resolveOfficialSlots(groups, qualifiedTeams, completedGroups, matches),
    [completedGroups, groups, matches, qualifiedTeams],
  )
  const leftRoundOf32 = matchesByNumber(officialSlots, [73, 75, 74, 77, 82, 81, 84, 83])
  const rightRoundOf32 = matchesByNumber(officialSlots, [76, 78, 79, 80, 85, 87, 88, 86])
  const leftRoundOf16 = matchesByNumber(officialSlots, [90, 89, 94, 93])
  const rightRoundOf16 = matchesByNumber(officialSlots, [91, 92, 96, 95])
  const leftQuarters = matchesByNumber(officialSlots, [97, 98])
  const rightQuarters = matchesByNumber(officialSlots, [99, 100])
  const leftSemis = matchesByNumber(officialSlots, [101])
  const rightSemis = matchesByNumber(officialSlots, [102])
  const finalMatches = matchesByNumber(officialSlots, [104])
  const thirdPlaceMatches = matchesByNumber(officialSlots, [103])
  const champion = finalChampion(finalMatches[0]?.liveMatch)
  const selectedGroupMatches = useMemo(
    () =>
      matches
        .filter((match) => match.stage === selectedGroup)
        .sort((a, b) => a.match_number - b.match_number),
    [matches, selectedGroup],
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
          <section className="knockout-card" aria-labelledby="knockout-title">
            <div className="group-table-title">
              <div>
                <h2 id="knockout-title">Mata-mata</h2>
              </div>
            </div>

            <div className="knockout-bracket">
              <div className="knockout-side left-side">
                <BracketConnectors side="left" />
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
                {champion && (
                  <div className="champion-card" aria-label="Campeão da Copa">
                    <span>Campeão</span>
                    <strong>
                      <TeamFlag fallback={champion.flag} team={champion.team} />
                      {champion.team}
                    </strong>
                  </div>
                )}
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
                <BracketConnectors side="right" />
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

                <section className="group-fixtures" aria-label={`Jogos do ${group}`}>
                  <div className="group-fixtures-title">
                    <span className="eyebrow">JOGOS DO GRUPO</span>
                    <strong>Ordem dos jogos</strong>
                  </div>

                  <div className="group-fixtures-list">
                    {selectedGroupMatches.map((match) => (
                      <article className="group-fixture" key={match.id}>
                        <small>Jogo {match.match_number}</small>
                        <div className="group-fixture-teams">
                          <span>
                            <TeamFlag fallback={match.home_flag} team={match.home_team} />
                            <strong>{match.home_team}</strong>
                          </span>
                          <b>
                            {formatMatchScore(match)}
                          </b>
                          <span>
                            <TeamFlag fallback={match.away_flag} team={match.away_team} />
                            <strong>{match.away_team}</strong>
                          </span>
                        </div>
                        <div className="group-fixture-meta">
                          <span>{formatMatchDate(match.kickoff_at)} · Abu Dhabi</span>
                          {match.venue && <span>{match.venue}</span>}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
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
