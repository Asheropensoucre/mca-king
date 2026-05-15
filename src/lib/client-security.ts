export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=')
    if (rawName === name) return decodeURIComponent(rawValue.join('='))
  }
  return null
}

export function csrfHeaders(): HeadersInit {
  const token = getCookie('mca_csrf')
  return token ? { 'x-csrf-token': token } : {}
}
