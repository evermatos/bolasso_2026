import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args = new Set(process.argv.slice(2))
const isDryRun = args.has('--dry-run')
const shouldListSports = args.has('--list-sports')

loadEnvFile('.env')
loadEnvFile('.env.local')

const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL')
const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY')
const oddsApiKey = env('THE_ODDS_API_KEY')
const sportKey = env('ODDS_SPORT_KEY') || 'soccer_fifa_world_cup'
const regions = env('ODDS_REGIONS') || 'eu'
const matchWindowHours = Number(env('ODDS_MATCH_WINDOW_HOURS') || 48)

const DRAW_NAMES = new Set(['draw', 'tie', 'empate'])
const TEAM_ALIASES = new Map([
  ['africa do sul', ['south africa']],
  ['alemanha', ['germany']],
  ['arabia saudita', ['saudi arabia']],
  ['argelia', ['algeria']],
  ['australia', ['australia']],
  ['austria', ['austria']],
  ['belgica', ['belgium']],
  ['bosnia e herzegovina', ['bosnia and herzegovina', 'bosnia-herzegovina']],
  ['brasil', ['brazil']],
  ['cabo verde', ['cape verde']],
  ['canada', ['canada']],
  ['catar', ['qatar']],
  ['colombia', ['colombia']],
  ['coreia do sul', ['south korea', 'korea republic', 'republic of korea']],
  ['costa do marfim', ['ivory coast', "cote d'ivoire", 'cote divoire']],
  ['croacia', ['croatia']],
  ['curacao', ['curacao']],
  ['egito', ['egypt']],
  ['equador', ['ecuador']],
  ['escocia', ['scotland']],
  ['espanha', ['spain']],
  ['estados unidos', ['united states', 'usa', 'usmnt', 'united states of america']],
  ['franca', ['france']],
  ['gana', ['ghana']],
  ['haiti', ['haiti']],
  ['inglaterra', ['england']],
  ['ira', ['iran']],
  ['iraque', ['iraq']],
  ['japao', ['japan']],
  ['jordania', ['jordan']],
  ['marrocos', ['morocco']],
  ['mexico', ['mexico']],
  ['noruega', ['norway']],
  ['nova zelandia', ['new zealand']],
  ['paises baixos', ['netherlands', 'holland']],
  ['panama', ['panama']],
  ['paraguai', ['paraguay']],
  ['portugal', ['portugal']],
  ['rd congo', ['dr congo', 'congo dr', 'democratic republic of congo', 'congo-kinshasa']],
  ['senegal', ['senegal']],
  ['suica', ['switzerland']],
  ['suecia', ['sweden']],
  ['tchequia', ['czechia', 'czech republic']],
  ['tunisia', ['tunisia']],
  ['turquia', ['turkey', 'turkiye']],
  ['uruguai', ['uruguay']],
  ['uzbequistao', ['uzbekistan']],
])

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

async function main() {
  requireEnv('THE_ODDS_API_KEY')

  if (shouldListSports) {
    await listSports()
    return
  }

  requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl) {
    throw new Error('Configure SUPABASE_URL ou VITE_SUPABASE_URL no .env.local.')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const [{ data: matches, error: matchesError }, events] = await Promise.all([
    supabase
      .from('matches')
      .select('id, match_number, home_team, away_team, kickoff_at, status')
      .eq('status', 'scheduled')
      .order('kickoff_at'),
    fetchOddsEvents(),
  ])

  if (matchesError) throw matchesError
  if (!matches?.length) {
    console.log('Nenhum jogo agendado encontrado no Supabase.')
    return
  }

  console.log(`Jogos agendados no banco: ${matches.length}`)
  console.log(`Eventos recebidos da API: ${events.length}`)

  const rows = []
  const matchedEventIds = new Set()

  for (const match of matches) {
    const event = findBestEvent(match, events)

    if (!event) {
      console.log(
        `- Sem odds: jogo ${match.match_number} ${match.home_team} x ${match.away_team}`,
      )
      continue
    }

    matchedEventIds.add(event.id)

    const odds = extractOdds(match, event)
    if (!odds) {
      console.log(
        `- Evento sem mercado h2h completo: jogo ${match.match_number} ${match.home_team} x ${match.away_team}`,
      )
      continue
    }

    const row = buildOddsRow(match, event, odds)
    rows.push(row)

    console.log(
      `+ Jogo ${match.match_number}: ${match.home_team} ${row.home_odds} | empate ${row.draw_odds} | ${match.away_team} ${row.away_odds} -> favorito ${row.favorite_pick}`,
    )
  }

  const unmatchedEvents = events.filter((event) => !matchedEventIds.has(event.id))
  if (unmatchedEvents.length) {
    console.log(`Eventos da API sem par no banco: ${unmatchedEvents.length}`)
    unmatchedEvents.slice(0, 12).forEach((event) => {
      console.log(`  · ${event.home_team} x ${event.away_team} (${event.commence_time})`)
    })
  }

  if (!rows.length) {
    console.log('Nenhuma odd pronta para gravar.')
    return
  }

  if (isDryRun) {
    console.log(`Dry run: ${rows.length} linhas seriam gravadas em match_odds.`)
    return
  }

  const { error } = await supabase.from('match_odds').upsert(rows, {
    onConflict: 'match_id',
  })

  if (error) throw error

  console.log(`Gravadas/atualizadas ${rows.length} linhas em match_odds.`)
}

async function listSports() {
  const url = new URL('https://api.the-odds-api.com/v4/sports/')
  url.searchParams.set('apiKey', oddsApiKey)
  url.searchParams.set('all', 'true')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`The Odds API falhou (${response.status}): ${await response.text()}`)
  }

  const sports = await response.json()
  sports
    .filter((sport) => sport.group?.toLowerCase().includes('soccer'))
    .forEach((sport) => {
      console.log(
        `${sport.key} | ${sport.title} | active=${sport.active} | ${sport.description}`,
      )
    })
}

async function fetchOddsEvents() {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`)
  url.searchParams.set('apiKey', oddsApiKey)
  url.searchParams.set('regions', regions)
  url.searchParams.set('markets', 'h2h')
  url.searchParams.set('oddsFormat', 'decimal')
  url.searchParams.set('dateFormat', 'iso')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`The Odds API falhou (${response.status}): ${await response.text()}`)
  }

  return response.json()
}

function findBestEvent(match, events) {
  const localHome = normalizeTeam(match.home_team)
  const localAway = normalizeTeam(match.away_team)
  const kickoff = new Date(match.kickoff_at).getTime()
  const windowMs = matchWindowHours * 60 * 60 * 1000

  return events
    .map((event) => {
      const eventHome = normalizeTeam(event.home_team)
      const eventAway = normalizeTeam(event.away_team)
      const sameTeams =
        teamMatches(localHome, eventHome) && teamMatches(localAway, eventAway)
      const swappedTeams =
        teamMatches(localHome, eventAway) && teamMatches(localAway, eventHome)

      if (!sameTeams && !swappedTeams) return null

      const eventTime = new Date(event.commence_time).getTime()
      const timeDiff = Math.abs(eventTime - kickoff)
      if (Number.isNaN(timeDiff) || timeDiff > windowMs) return null

      return { event, timeDiff }
    })
    .filter(Boolean)
    .sort((a, b) => a.timeDiff - b.timeDiff)[0]?.event
}

function extractOdds(match, event) {
  const buckets = {
    home: [],
    draw: [],
    away: [],
  }

  for (const bookmaker of event.bookmakers || []) {
    const market = bookmaker.markets?.find((candidate) => candidate.key === 'h2h')
    if (!market) continue

    for (const outcome of market.outcomes || []) {
      const bucket = outcomeBucket(match, outcome.name)
      if (bucket && Number.isFinite(outcome.price)) buckets[bucket].push(outcome.price)
    }
  }

  if (!buckets.home.length || !buckets.draw.length || !buckets.away.length) {
    return null
  }

  return {
    home: average(buckets.home),
    draw: average(buckets.draw),
    away: average(buckets.away),
    bookmakersCount: Math.max(
      buckets.home.length,
      buckets.draw.length,
      buckets.away.length,
    ),
  }
}

function outcomeBucket(match, outcomeName) {
  const normalizedOutcome = normalizeTeam(outcomeName)
  if (DRAW_NAMES.has(normalizedOutcome)) return 'draw'
  if (teamMatches(normalizeTeam(match.home_team), normalizedOutcome)) return 'home'
  if (teamMatches(normalizeTeam(match.away_team), normalizedOutcome)) return 'away'
  return null
}

function buildOddsRow(match, event, odds) {
  const favoritePick = ['home', 'draw', 'away'].sort((left, right) => {
    return odds[left] - odds[right]
  })[0]
  const impliedHome = 1 / odds.home
  const impliedDraw = 1 / odds.draw
  const impliedAway = 1 / odds.away
  const impliedTotal = impliedHome + impliedDraw + impliedAway

  return {
    match_id: match.id,
    provider: 'the-odds-api',
    provider_sport_key: event.sport_key || sportKey,
    provider_event_id: event.id,
    home_odds: roundOdds(odds.home),
    draw_odds: roundOdds(odds.draw),
    away_odds: roundOdds(odds.away),
    favorite_pick: favoritePick,
    favorite_odds: roundOdds(odds[favoritePick]),
    implied_home_probability: roundProbability(impliedHome / impliedTotal),
    implied_draw_probability: roundProbability(impliedDraw / impliedTotal),
    implied_away_probability: roundProbability(impliedAway / impliedTotal),
    bookmakers_count: odds.bookmakersCount,
    fetched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    raw: event,
  }
}

function normalizeTeam(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
}

function teamMatches(localTeam, providerTeam) {
  if (localTeam === providerTeam) return true

  const aliases = TEAM_ALIASES.get(localTeam) || []
  return aliases.some((alias) => normalizeTeam(alias) === providerTeam)
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function roundOdds(value) {
  return Number(value.toFixed(3))
}

function roundProbability(value) {
  return Number(value.toFixed(6))
}

function env(key) {
  return process.env[key]?.trim()
}

function requireEnv(key) {
  if (!env(key)) throw new Error(`Configure ${key} no .env.local.`)
}

function loadEnvFile(path) {
  if (!existsSync(path)) return

  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    if (process.env[key]) continue

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
}
