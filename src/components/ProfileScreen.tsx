import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, LoaderCircle, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isValidUsername } from '../lib/username'
import {
  PROFILE_AVATARS,
  ProfileAvatar,
  type ProfileAvatarKey,
} from './ProfileAvatar'

type Props = {
  avatarKey: string
  displayName: string
  onProfileUpdated: () => Promise<void>
}

export function ProfileScreen({
  avatarKey,
  displayName,
  onProfileUpdated,
}: Props) {
  const [selectedAvatar, setSelectedAvatar] = useState<ProfileAvatarKey>(
    avatarKey as ProfileAvatarKey,
  )
  const [avatarMessage, setAvatarMessage] = useState('')
  const [avatarError, setAvatarError] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [username, setUsername] = useState(displayName)
  const [usernameMessage, setUsernameMessage] = useState('')
  const [usernameError, setUsernameError] = useState(false)
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => setUsername(displayName), [displayName])
  useEffect(
    () => setSelectedAvatar(avatarKey as ProfileAvatarKey),
    [avatarKey],
  )

  async function updateAvatar(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    setAvatarLoading(true)
    setAvatarMessage('')
    setAvatarError(false)

    const { error } = await supabase.rpc('update_profile_avatar', {
      new_avatar_key: selectedAvatar,
    })

    setAvatarLoading(false)
    setAvatarError(Boolean(error))
    setAvatarMessage(error ? error.message : 'Imagem de perfil atualizada.')

    if (!error) await onProfileUpdated()
  }

  async function updateUsername(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (!isValidUsername(username)) {
      setUsernameError(true)
      setUsernameMessage(
        'Use de 3 a 24 caracteres: letras sem acento, números, espaços, ponto, hífen ou sublinhado.',
      )
      return
    }

    setUsernameLoading(true)
    setUsernameMessage('')
    setUsernameError(false)

    const { error } = await supabase.rpc('update_username', {
      new_username: username.trim(),
    })

    setUsernameLoading(false)
    setUsernameError(Boolean(error))
    setUsernameMessage(
      error
        ? error.message
        : 'Username atualizado. Use o novo nome no próximo login.',
    )

    if (!error) await onProfileUpdated()
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    if (password !== confirmation) {
      setPasswordError(true)
      setPasswordMessage('As senhas não coincidem.')
      return
    }

    setPasswordLoading(true)
    setPasswordMessage('')
    setPasswordError(false)

    const { error } = await supabase.auth.updateUser({ password })

    setPasswordLoading(false)
    setPasswordError(Boolean(error))
    setPasswordMessage(
      error
        ? error.message
        : 'Senha definida com sucesso. Use-a no próximo acesso.',
    )

    if (!error) {
      setPassword('')
      setConfirmation('')
    }
  }

  return (
    <section className="profile-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MINHA CONTA</span>
          <h2>{displayName}</h2>
        </div>
        <KeyRound size={28} />
      </div>

      <p className="profile-username">@{displayName}</p>
      <p className="muted">
        Você entra usando este username e sua senha. A senha não pode ser
        visualizada pelo administrador.
      </p>

      <form className="profile-form avatar-form" onSubmit={updateAvatar}>
        <div className="profile-form-heading">
          <UserRound size={20} />
          <strong>Escolha sua imagem</strong>
        </div>
        <p className="avatar-form-description">
          Selecione um avatar inspirado em futebol e Copa do Mundo.
        </p>
        <div className="avatar-picker">
          {PROFILE_AVATARS.map((avatar) => (
            <button
              aria-label={avatar.label}
              aria-pressed={selectedAvatar === avatar.key}
              className={selectedAvatar === avatar.key ? 'selected' : ''}
              key={avatar.key}
              onClick={() => setSelectedAvatar(avatar.key)}
              title={avatar.label}
              type="button"
            >
              <ProfileAvatar
                avatarKey={avatar.key}
                displayName={displayName}
                size="large"
              />
              <span>{avatar.label}</span>
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          disabled={avatarLoading || selectedAvatar === avatarKey}
          type="submit"
        >
          {avatarLoading && <LoaderCircle className="spin" size={18} />}
          Salvar imagem
        </button>
        {avatarMessage && (
          <p className={`form-message ${avatarError ? 'error' : ''}`}>
            {avatarMessage}
          </p>
        )}
      </form>

      <form className="profile-form profile-section-form" onSubmit={updateUsername}>
        <div className="profile-form-heading">
          <UserRound size={20} />
          <strong>Alterar username</strong>
        </div>
        <label>
          Username
          <input
            autoCapitalize="none"
            autoComplete="username"
            maxLength={24}
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ex.: Gilberto Barros"
            required
            value={username}
          />
        </label>
        <button
          className="primary-button"
          disabled={usernameLoading || username.trim() === displayName}
          type="submit"
        >
          {usernameLoading && <LoaderCircle className="spin" size={18} />}
          Salvar username
        </button>
        {usernameMessage && (
          <p className={`form-message ${usernameError ? 'error' : ''}`}>
            {usernameMessage}
          </p>
        )}
      </form>

      <form className="profile-form profile-section-form" onSubmit={updatePassword}>
        <div className="profile-form-heading">
          <KeyRound size={20} />
          <strong>Alterar senha</strong>
        </div>
        <label>
          Nova senha
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="No mínimo 8 caracteres"
            required
            type="password"
            value={password}
          />
        </label>
        <label>
          Confirme a nova senha
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Digite a senha novamente"
            required
            type="password"
            value={confirmation}
          />
        </label>
        <button className="primary-button" disabled={passwordLoading} type="submit">
          {passwordLoading && <LoaderCircle className="spin" size={18} />}
          Salvar senha
        </button>
        {passwordMessage && (
          <p className={`form-message ${passwordError ? 'error' : ''}`}>
            {passwordMessage}
          </p>
        )}
      </form>
    </section>
  )
}
