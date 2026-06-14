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
import { GroupStandings } from './components/GroupStandings'
import { MatchCard } from './components/MatchCard'
import { ProfileAvatar } from './components/ProfileAvatar'
import { ProfileScreen } from './components/ProfileScreen'
import { Ranking } from './components/Ranking'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import type { Match, Prediction, Profile, RankingRow } from './types'

type Tab = 'matches' | 'standings' | 'ranking' | 'admin' | 'profile'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [tab, setTab] = useState<Tab>('matches')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [notice, setNotice] = useState('')
  const [dataError, setDataError] = useState('')
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    if (!supabase) return

    const [profileResult, matchesResult, predictionsResult, rankingResult] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_key, is_admin')
          .eq('id', userId)
          .single(),
        supabase.from('matches').select('*').order('kickoff_at'),
        supabase
          .from('predictions')
          .select('match_id, home_score, away_score, points')
          .eq('user_id', userId),
        supabase.rpc('get_ranking'),
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
    options?: { silent?: boolean },
  ) {
    if (!supabase || !session) return false

    const { error } = await supabase.from('predictions').upsert(
      {
        user_id: session.user.id,
        match_id: matchId,
        home_score: home,
        away_score: away,
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

  async function saveResult(matchId: number, home: number, away: number) {
    if (!supabase || !session) return false

    const { error } = await supabase.rpc('finish_match', {
      target_match_id: matchId,
      final_home_score: home,
      final_away_score: away,
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
    return <AuthScreen />
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
  const futureMatches = matches.filter((match) => match.status !== 'finished')
  const finishedMatches = matches.filter((match) => match.status === 'finished')

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('matches')} type="button">
          <span className="brand-mark small"><Trophy size={20} /></span>
          <span><strong>Bolasso</strong><small>2026</small></span>
        </button>

        <nav className="desktop-nav">
          <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
            Jogos
          </button>
          <button className={tab === 'ranking' ? 'active' : ''} onClick={() => setTab('ranking')}>
            Ranking
          </button>
          <button className={tab === 'standings' ? 'active' : ''} onClick={() => setTab('standings')}>
            Tabela
          </button>
          {isAdmin && (
            <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
              Administração
            </button>
          )}
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
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
          <ProfileAvatar
            avatarKey={profile?.avatar_key}
            displayName={displayName}
            size="small"
          />
          <span className="user-name">{displayName}</span>
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
                <strong>{predictions.length}/{futureMatches.length}</strong>
                <span>palpites feitos</span>
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
          <Ranking rows={ranking} currentUserId={session?.user.id} />
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
            <div className="match-grid">
              {matches.map((match) => (
                <MatchCard
                  isAdmin
                  key={match.id}
                  match={match}
                  onSave={saveResult}
                />
              ))}
            </div>
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
        <button className={tab === 'matches' ? 'active' : ''} onClick={() => setTab('matches')}>
          <CalendarDays size={21} /><span>Jogos</span>
        </button>
        <button className={tab === 'ranking' ? 'active' : ''} onClick={() => setTab('ranking')}>
          <BarChart3 size={21} /><span>Ranking</span>
        </button>
        <button className={tab === 'standings' ? 'active' : ''} onClick={() => setTab('standings')}>
          <Table2 size={21} /><span>Tabela</span>
        </button>
        {isAdmin && (
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
            <Settings size={21} /><span>Admin</span>
          </button>
        )}
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          <UserRound size={21} /><span>Perfil</span>
        </button>
      </nav>

      {notice && <div className="toast">{notice}</div>}
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
