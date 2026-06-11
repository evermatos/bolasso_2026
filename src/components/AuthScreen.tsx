import { FormEvent, useState } from 'react'
import { LoaderCircle, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    setLoading(true)
    setMessage('')

    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`
    const result =
      mode === 'signup'
        ? await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              data: { display_name: name.trim() },
            },
          })
        : await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: false,
            },
          })

    setLoading(false)
    setMessage(
      result.error
        ? result.error.message
        : 'Enviamos um link de acesso para o seu e-mail.',
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-mark">
          <Trophy size={30} strokeWidth={2.4} />
        </div>
        <span className="eyebrow">COPA DO MUNDO 2026</span>
        <h1>Seu palpite.<br />Sua glória.</h1>
        <p>
          Chame a turma, arrisque os placares e acompanhe quem entende mesmo
          de futebol.
        </p>
        <div className="score-preview">
          <span>🇧🇷</span>
          <strong>2</strong>
          <small>×</small>
          <strong>1</strong>
          <span>🇦🇷</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="segmented">
            <button
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <h2>{mode === 'login' ? 'Bem-vindo de volta' : 'Entre no bolão'}</h2>
          <p className="muted">
            Você receberá um link seguro. Sem senha para esquecer.
          </p>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Seu nome
                <input
                  minLength={2}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Como aparecerá no ranking"
                />
              </label>
            )}
            <label>
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
              />
            </label>
            <button className="primary-button" disabled={loading} type="submit">
              {loading && <LoaderCircle className="spin" size={18} />}
              Enviar link de acesso
            </button>
          </form>

          {message && <p className="form-message">{message}</p>}

        </div>
      </section>
    </main>
  )
}
