import type { Session } from '@supabase/supabase-js'
import {
  BarChart3,
  CalendarDays,
  LogOut,
  Settings,
  Table2,
  Target,
  Trophy,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { GroupInfoModal } from './components/GroupInfoModal'
import { GroupStandings } from './components/GroupStandings'
import { KnockoutInfoModal } from './components/KnockoutInfoModal'
import { MatchCard } from './components/MatchCard'
import { OraclePredictionModal } from './components/OraclePredictionModal'
import { ProfileAvatar } from './components/ProfileAvatar'
import { ProfileScreen } from './components/ProfileScreen'
import { Ranking } from './components/Ranking'
import { ThemeToggle } from './components/ThemeToggle'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Match, Prediction, Profile, RankingRow } from './types'

type Tab = 'matches' | 'standings' | 'ranking' | 'admin' | 'profile'
type Theme = 'light' | 'dark'

function comparePredictionMatches(left: Match, right: Match) {
  const leftIsKnockout = left.match_number >= 73
  const rightIsKnockout = right.match_number >= 73

  if (leftIsKnockout && rightIsKnockout) {
    return (
      new Date(left.kickoff_at).getTime() -
        new Date(right.kickoff_at).getTime() ||
      left.match_number - right.match_number
    )
  }

  return left.match_number - right.match_number
}

function compareFinishedPredictionMatches(left: Match, right: Match) {
  return (
    new Date(right.kickoff_at).getTime() -
      new Date(left.kickoff_at).getTime() ||
    right.match_number - left.match_number
  )
}

function compareMatchesByKickoff(left: Match, right: Match) {
  return (
    new Date(left.kickoff_at).getTime() -
      new Date(right.kickoff_at).getTime() ||
    left.match_number - right.match_number
  )
}

function getInitialTheme(): Theme {
  const savedTheme = window.localStorage.getItem('bolasso-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [tab, setTab] = useState<Tab>('matches')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [groupRanking, setGroupRanking] = useState<RankingRow[]>([])
  const [knockoutRanking, setKnockoutRanking] = useState<RankingRow[]>([])
  const [infoMatch, setInfoMatch] = useState<Match | null>(null)
  const [oracleMatch, setOracleMatch] = useState<Match | null>(null)
  const [notice, setNotice] = useState('')
  const [dataError, setDataError] = useState('')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('bolasso-theme', theme)

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#081510' : '#f4f5ef')
  }, [theme])

  const loadData = useCallback(async (userId: string) => {
    if (!supabase) return

    const [
      profileResult,
      matchesResult,
      predictionsResult,
      rankingResult,
      groupRankingResult,
      knockoutRankingResult,
    ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_key, is_admin')
          .eq('id', userId)
          .single(),
        supabase.from('matches').select('*').order('match_number'),
        supabase
          .from('predictions')
          .select('match_id, home_score, away_score, predicted_qualifier, points')
          .eq('user_id', userId),
        supabase.rpc('get_ranking'),
        supabase.rpc('get_ranking_by_match_range', {
          min_match_number: 1,
          max_match_number: 72,
        }),
        supabase.rpc('get_ranking_by_match_range', {
          min_match_number: 73,
          max_match_number: 104,
        }),
      ])

    const error =
      profileResult.error ??
      matchesResult.error ??
      predictionsResult.error ??
      rankingResult.error

    if (error) {
      setDataError(error.message)
      setLoading(false)
      return
    }

    setDataError('')
    if (profileResult.data) setProfile(profileResult.data)
    if (matchesResult.data) setMatches(matchesResult.data)
    if (predictionsResult.data) setPredictions(predictionsResult.data)
    if (rankingResult.data) setRanking(rankingResult.data)
    if (!groupRankingResult.error && groupRankingResult.data) {
      setGroupRanking(groupRankingResult.data)
    }
    if (!knockoutRankingResult.error && knockoutRankingResult.data) {
      setKnockoutRanking(knockoutRankingResult.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadData(data.session.user.id)
      else setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) loadData(nextSession.user.id)
    })

    return () => data.subscription.unsubscribe()
  }, [loadData])

  useEffect(() => {
    if (!supabase || !session) return

    const client = supabase
    const userId = session.user.id
    let refreshTimer: number | undefined

    function scheduleRefresh() {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        void loadData(userId)
      }, 350)
    }

    const channel = client
      .channel(`bolasso-live-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'predictions' },
        scheduleRefresh,
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    const fallbackInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }, 60_000)

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }

    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearTimeout(refreshTimer)
      window.clearInterval(fallbackInterval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      setRealtimeConnected(false)
      void client.removeChannel(channel)
    }
  }, [loadData, session])

  useEffect(() => {
    const currentScript = document.querySelector<HTMLScriptElement>(
      'script[type="module"][src]',
    )?.src

    if (!currentScript || import.meta.env.DEV) return
    const currentScriptPath = new URL(currentScript).pathname

    let checking = false

    function isEditing() {
      const activeElement = document.activeElement
      return (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLSelectElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      )
    }

    async function checkForNewVersion() {
      if (checking) return
      checking = true

      try {
        const indexUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
        indexUrl.searchParams.set('version-check', Date.now().toString())

        const response = await fetch(indexUrl, { cache: 'no-store' })
        if (!response.ok) return

        const html = await response.text()
        const documentCopy = new DOMParser().parseFromString(html, 'text/html')
        const latestScriptSource = documentCopy.querySelector<HTMLScriptElement>(
          'script[type="module"][src]',
        )?.getAttribute('src')
        const latestScriptPath = latestScriptSource
          ? new URL(latestScriptSource, window.location.origin).pathname
          : ''

        if (latestScriptPath && latestScriptPath !== currentScriptPath) {
          if (!isEditing()) {
            window.location.reload()
          } else {
            setUpdateAvailable(true)
          }
        }
      } catch {
        // A próxima verificação tenta novamente sem interromper o uso do site.
      } finally {
        checking = false
      }
    }

    const versionInterval = window.setInterval(() => {
      void checkForNewVersion()
    }, 60_000)

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') {
        if (updateAvailable && !isEditing()) {
          window.location.reload()
          return
        }
        void checkForNewVersion()
      }
    }

    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      window.clearInterval(versionInterval)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [updateAvailable])

  const predictionMap = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.match_id, prediction])),
    [predictions],
  )

  async function savePrediction(
    matchId: number,
    home: number,
    away: number,
    options?: {
      awayPenalty?: number | null
      homePenalty?: number | null
      predictedQualifier?: 'home' | 'away' | null
      silent?: boolean
    },
  ) {
    if (!supabase || !session) return false

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id: session.user.id,
        match_id: matchId,
        home_score: home,
        away_score: away,
        predicted_qualifier: options?.predictedQualifier ?? null,
      },
      { onConflict: 'user_id,match_id' },
    )

    if (error) {
      showNotice(error.message)
      return false
    }
    await loadData(session.user.id)
    if (!options?.silent) showNotice('Palpite confirmado.')
    return true
  }

  async function saveResult(
    matchId: number,
    home: number,
    away: number,
    options?: {
      awayPenalty?: number | null
      homePenalty?: number | null
      predictedQualifier?: 'home' | 'away' | null
      silent?: boolean
    },
  ) {
    if (!supabase || !session) return false

    const { error } = await supabase.rpc('finish_match', {
      target_match_id: matchId,
      final_home_score: home,
      final_away_score: away,
      final_home_penalty_score: options?.homePenalty ?? null,
      final_away_penalty_score: options?.awayPenalty ?? null,
    })

    if (error) {
      showNotice(error.message)
      return false
    }
    await loadData(session.user.id)
    showNotice('Resultado publicado e pontos recalculados.')
    return true
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3000)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'dark' ? 'light' : 'dark',
    )
  }

  function navigateToTab(nextTab: Tab) {
    setTab(nextTab)

    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      document.getElementById('app-top')?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="configuration-screen">
        <div>
          <Trophy size={34} />
          <h1>Bolasso indisponível</h1>
          <p>
            O banco de dados ainda não foi configurado neste ambiente.
          </p>
        </div>
      </main>
    )
  }

  if (!session && !loading) {
    return <AuthScreen onThemeToggle={toggleTheme} theme={theme} />
  }

  if (loading) {
    return <div className="loading-screen">Carregando o bolão...</div>
  }

  if (dataError) {
    return (
      <main className="configuration-screen">
        <div>
          <h1>Não foi possível carregar o bolão</h1>
          <p>{dataError}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </main>
    )
  }

  const displayName = profile?.display_name ?? 'Participante'
  const isAdmin = Boolean(profile?.is_admin)
  const predictionMatches = matches.filter((match) => {
    if (match.match_number <= 88) return true
    if (match.match_number > 100) return false

    return !/^W\d+|^RU\d+/.test(match.home_team) &&
      !/^W\d+|^RU\d+/.test(match.away_team)
  })
  const futureMatches = predictionMatches
    .filter((match) => match.status !== 'finished')
    .sort(comparePredictionMatches)
  const finishedMatches = predictionMatches
    .filter((match) => match.status === 'finished')
    .sort(compareFinishedPredictionMatches)
  const adminFutureMatches = matches
    .filter((match) => match.status !== 'finished')
    .sort(compareMatchesByKickoff)
  const adminFinishedMatches = matches
    .filter((match) => match.status === 'finished')
    .sort(compareMatchesByKickoff)
  const futureMatchIds = new Set(futureMatches.map((match) => match.id))
  const futurePredictionsCount = predictions.filter((prediction) =>
    futureMatchIds.has(prediction.match_id),
  ).length

  return (
    <div className="app-shell" id="app-top">
      <header className="topbar">
        <button className="brand" onClick={() => navigateToTab('matches')} type="button">
          <span className="brand-mark small"><Trophy size={20} /></span>
          <span><strong>Bolasso</strong><small>2026</small></span>
        </button>

        <nav className="desktop-nav">
          <button className={tab === 'matches' ? 'active' : ''} onClick={() => navigateToTab('matches')}>
            Jogos
          </button>
          <button className={tab === 'ranking' ? 'active' : ''} onClick={() => navigateToTab('ranking')}>
            Ranking
          </button>
          <button className={tab === 'standings' ? 'active' : ''} onClick={() => navigateToTab('standings')}>
            Copa
          </button>
          {isAdmin && (
            <button className={tab === 'admin' ? 'active' : ''} onClick={() => navigateToTab('admin')}>
              Administração
            </button>
          )}
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => navigateToTab('profile')}>
            Perfil
          </button>
        </nav>

        <div className="user-menu">
          <span
            className={`live-status ${realtimeConnected ? 'connected' : ''}`}
            title={
              realtimeConnected
                ? 'Atualizações automáticas ativas'
                : 'Reconectando atualizações'
            }
          >
            <span aria-hidden="true" />
            {realtimeConnected ? 'Ao vivo' : 'Reconectando'}
          </span>
          <button
            aria-label="Abrir perfil"
            className="profile-shortcut"
            onClick={() => navigateToTab('profile')}
            type="button"
          >
            <ProfileAvatar
              avatarKey={profile?.avatar_key}
              displayName={displayName}
              size="small"
            />
            <span className="user-name">{displayName}</span>
          </button>
          <ThemeToggle onToggle={toggleTheme} theme={theme} />
          <button aria-label="Sair" onClick={signOut} title="Sair"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="content">
        {tab === 'matches' && (
          <>
            <section className="hero-card">
              <div>
                <span className="eyebrow">RODADA DE PALPITES</span>
                <h1>Hora de cravar<br />os placares.</h1>
                <p>Os palpites fecham 5 minutos antes de cada jogo.</p>
              </div>
              <div className="hero-stat">
                <Target size={30} />
                <strong>{futurePredictionsCount}/{futureMatches.length}</strong>
                <span>Palpites feitos</span>
              </div>
              <img
                className="supporters-art predictions-supporters-art"
                src={`${import.meta.env.BASE_URL}images/torcedores.webp`}
                alt=""
                aria-hidden="true"
              />
            </section>

            <div className="page-heading">
              <div>
                <span className="eyebrow">PRÓXIMOS JOGOS</span>
                <h2>Faça seus palpites</h2>
              </div>
              <CalendarDays size={26} />
            </div>

            <section className="match-grid">
              {futureMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onAskOracle={match.match_number <= 100 ? setOracleMatch : undefined}
                  onShowInfo={setInfoMatch}
                  onSave={savePrediction}
                  prediction={predictionMap.get(match.id)}
                />
              ))}
            </section>

            {finishedMatches.length > 0 && (
              <>
                <div className="page-heading compact">
                  <div>
                    <span className="eyebrow">FINALIZADOS</span>
                    <h2>Resultados e pontos</h2>
                  </div>
                </div>
                <section className="match-grid">
                  {finishedMatches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onShowInfo={setInfoMatch}
                      onSave={savePrediction}
                      prediction={predictionMap.get(match.id)}
                    />
                  ))}
                </section>
              </>
            )}
          </>
        )}

        {tab === 'ranking' && (
          <Ranking
            currentUserId={session?.user.id}
            groupRows={groupRanking}
            knockoutRows={knockoutRanking}
            rows={ranking}
          />
        )}

        {tab === 'standings' && <GroupStandings matches={matches} />}

        {tab === 'admin' && isAdmin && (
          <section>
            <div className="admin-header">
              <div>
                <span className="eyebrow">PAINEL DO ADMINISTRADOR</span>
                <h1>Publicar resultados</h1>
                <p>Ao publicar, todos os palpites recebem seus pontos automaticamente.</p>
              </div>
              <Settings size={34} />
            </div>

            <section className="admin-match-section">
              <div className="admin-section-heading">
                <div>
                  <span className="eyebrow">PENDENTES</span>
                  <h2>Jogos para publicar</h2>
                </div>
                <span>{adminFutureMatches.length}</span>
              </div>

              {adminFutureMatches.length > 0 ? (
                <div className="match-grid">
                  {adminFutureMatches.map((match) => (
                    <MatchCard
                      isAdmin
                      key={match.id}
                      match={match}
                      onShowInfo={match.match_number <= 72 ? setInfoMatch : undefined}
                      onSave={saveResult}
                    />
                  ))}
                </div>
              ) : (
                <div className="admin-empty-state">
                  Todos os resultados disponíveis já foram publicados.
                </div>
              )}
            </section>

            {adminFinishedMatches.length > 0 && (
              <section className="admin-match-section published-results">
                <div className="admin-section-heading">
                  <div>
                    <span className="eyebrow">HISTÓRICO</span>
                    <h2>Resultados publicados</h2>
                  </div>
                  <span>{adminFinishedMatches.length}</span>
                </div>
                <p className="admin-section-description">
                  Os placares abaixo continuam disponíveis para eventuais correções.
                </p>
                <div className="match-grid">
                  {adminFinishedMatches.map((match) => (
                    <MatchCard
                      isAdmin
                      key={match.id}
                      match={match}
                      onShowInfo={match.match_number <= 72 ? setInfoMatch : undefined}
                      onSave={saveResult}
                    />
                  ))}
                </div>
              </section>
            )}
          </section>
        )}

        {tab === 'profile' && session && (
          <ProfileScreen
            avatarKey={profile?.avatar_key ?? 'classic-ball'}
            displayName={displayName}
            onProfileUpdated={() => loadData(session.user.id)}
          />
        )}
      </main>

      <nav className="mobile-nav">
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => navigateToTab('matches')}>
          <CalendarDays size={21} /><span>Jogos</span>
        </button>
        <button className={tab === 'ranking' ? 'active' : ''} onClick={() => navigateToTab('ranking')}>
          <BarChart3 size={21} /><span>Ranking</span>
        </button>
        <button className={tab === 'standings' ? 'active' : ''} onClick={() => navigateToTab('standings')}>
          <Table2 size={21} /><span>Copa</span>
        </button>
        {isAdmin && (
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => navigateToTab('admin')}>
            <Settings size={21} /><span>Admin</span>
          </button>
        )}
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => navigateToTab('profile')}>
          <UserRound size={21} /><span>Perfil</span>
        </button>
      </nav>

      {notice && <div className="toast">{notice}</div>}
      {infoMatch && infoMatch.match_number <= 72 && (
        <GroupInfoModal
          match={infoMatch}
          matches={matches}
          onClose={() => setInfoMatch(null)}
        />
      )}
      {infoMatch && infoMatch.match_number >= 73 && (
        <KnockoutInfoModal
          match={infoMatch}
          matches={matches}
          onClose={() => setInfoMatch(null)}
        />
      )}
      {oracleMatch && (
        <OraclePredictionModal
          match={oracleMatch}
          onClose={() => setOracleMatch(null)}
        />
      )}
      {updateAvailable && (
        <div className="update-banner" role="status">
          <div>
            <strong>Nova versão disponível</strong>
            <span>Atualize para receber as últimas melhorias do Bolasso.</span>
          </div>
          <button onClick={() => window.location.reload()} type="button">
            Atualizar agora
          </button>
        </div>
      )}
    </div>
  )
}
