import { FormEvent, useState } from 'react'
import { LoaderCircle, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidUsername, usernameToAuthEmail } from '../lib/username'

export function AuthScreen() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (!isValidUsername(username)) {
      setIsError(true)
      setMessage(
        'Use de 3 a 24 caracteres: letras sem acento, números, espaços, ponto, hífen ou sublinhado.',
      )
      return
    }

    if (mode === 'signup' && password !== passwordConfirmation) {
      setIsError(true)
      setMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    setMessage('')
    setIsError(false)
    const authEmail = usernameToAuthEmail(username)

    const result =
      mode === 'signup'
        ? await supabase.auth.signUp({
            email: authEmail,
            password,
            options: {
              data: { display_name: username.trim() },
            },
          })
        : await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })

    setLoading(false)
    setIsError(Boolean(result.error))

    if (result.error) {
      setMessage(result.error.message)
    } else if (mode === 'signup' && !result.data.session) {
      setMessage(
        'O Supabase ainda está exigindo confirmação. Desative Confirm email nas configurações.',
      )
    } else {
      setMessage(mode === 'signup' ? 'Conta criada com sucesso.' : '')
    }
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
        <img
          className="supporters-art auth-supporters-art"
          src={`${import.meta.env.BASE_URL}images/torcedores.webp`}
          alt=""
          aria-hidden="true"
        />
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
            {mode === 'login'
              ? 'Use seu username e sua senha para acessar.'
              : 'Crie uma conta para registrar seus palpites.'}
          </p>

          <form onSubmit={handleSubmit}>
            <label>
              Username
              <input
                autoCapitalize="none"
                autoComplete="username"
                maxLength={24}
                minLength={3}
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Ex.: Gilberto Barros"
              />
            </label>
            <label>
              Senha
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="No mínimo 8 caracteres"
                required
                type="password"
                value={password}
              />
            </label>
            {mode === 'signup' && (
              <label>
                Confirme a senha
                <input
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Digite a senha novamente"
                  required
                  type="password"
                  value={passwordConfirmation}
                />
              </label>
            )}
            <button className="primary-button" disabled={loading} type="submit">
              {loading && <LoaderCircle className="spin" size={18} />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {message && (
            <p className={`form-message ${isError ? 'error' : ''}`}>{message}</p>
          )}

        </div>
      </section>
    </main>
  )
}
