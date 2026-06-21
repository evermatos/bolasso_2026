import { LoaderCircle, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Match, OraclePick, OraclePrediction } from '../types'
import { TeamFlag } from './TeamFlag'

type Props = {
  match: Match
  onClose: () => void
}

type OraclePhase = 'consulting' | 'revealed' | 'error'

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function OraclePredictionModal({ match, onClose }: Props) {
  const [phase, setPhase] = useState<OraclePhase>('consulting')
  const [oraclePrediction, setOraclePrediction] =
    useState<OraclePrediction | null>(null)
  const [error, setError] = useState('')

  const selectedLabel = useMemo(() => {
    if (!oraclePrediction) return ''
    if (oraclePrediction.pick === 'home') return match.home_team
    if (oraclePrediction.pick === 'away') return match.away_team
    return 'Empate'
  }, [match.away_team, match.home_team, oraclePrediction])

  useEffect(() => {
    let active = true

    async function consultOracle() {
      if (!supabase) return

      setPhase('consulting')
      setError('')

      const [result] = await Promise.all([
        supabase.rpc('get_oracle_prediction', {
          target_match_id: match.id,
        }),
        delay(1700),
      ])

      if (!active) return

      if (result.error) {
        setError(result.error.message)
        setPhase('error')
        return
      }

      const prediction = result.data?.[0] as OraclePrediction | undefined
      if (!prediction) {
        setError('O polvo ficou em silêncio. Tente novamente.')
        setPhase('error')
        return
      }

      setOraclePrediction(prediction)
      setPhase('revealed')
    }

    void consultOracle()

    return () => {
      active = false
    }
  }, [match.id])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      aria-labelledby="oracle-title"
      aria-modal="true"
      className="oracle-overlay"
      role="dialog"
    >
      <button
        aria-label="Fechar palpite do polvo"
        className="oracle-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className={`oracle-modal oracle-${phase}`}>
        <div className="oracle-header">
          <div>
            <span className="eyebrow">ORÁCULO DO BOLASSO</span>
            <h2 id="oracle-title">Palpite do polvo</h2>
            <p>
              Ele escolhe apenas vitória de um lado ou empate. O placar ainda
              é por sua conta.
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="oracle-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="oracle-stage" aria-live="polite">
          <div className="oracle-orb">
            <span className="oracle-bubble bubble-one" />
            <span className="oracle-bubble bubble-two" />
            <span className="oracle-bubble bubble-three" />
            <span className="oracle-octopus" aria-hidden="true">🐙</span>
          </div>

          <div className="oracle-matchup">
            <span>
              <TeamFlag fallback={match.home_flag} team={match.home_team} />
              {match.home_team}
            </span>
            <strong>×</strong>
            <span>
              {match.away_team}
              <TeamFlag fallback={match.away_flag} team={match.away_team} />
            </span>
          </div>

          {phase === 'consulting' && (
            <div className="oracle-thinking">
              <LoaderCircle className="spin" size={18} />
              O polvo está escolhendo...
            </div>
          )}

          {phase === 'error' && (
            <p className="form-message error">{error}</p>
          )}

          {phase === 'revealed' && oraclePrediction && (
            <div className="oracle-result">
              <Sparkles size={20} />
              <span>O polvo escolheu</span>
              <strong>{selectedLabel}</strong>
            </div>
          )}
        </div>

        <div className="oracle-choices">
          {(['home', 'draw', 'away'] as OraclePick[]).map((pick) => (
            <div
              className={oraclePrediction?.pick === pick ? 'selected' : ''}
              key={pick}
            >
              {pick === 'home' && (
                <>
                  <TeamFlag fallback={match.home_flag} team={match.home_team} />
                  <strong>{match.home_team}</strong>
                </>
              )}
              {pick === 'draw' && (
                <>
                  <span className="oracle-draw-icon">×</span>
                  <strong>Empate</strong>
                </>
              )}
              {pick === 'away' && (
                <>
                  <TeamFlag fallback={match.away_flag} team={match.away_team} />
                  <strong>{match.away_team}</strong>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
