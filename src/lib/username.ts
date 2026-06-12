const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value))
}

export function usernameToAuthEmail(value: string) {
  return `${normalizeUsername(value)}@bolasso.invalid`
}
