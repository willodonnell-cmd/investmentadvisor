export type EnvTone = 'local' | 'prod' | 'other'

export function getEnvLabel(): { label: string; detail: string; tone: EnvTone } {
  if (typeof window === 'undefined') {
    return { label: 'Unknown', detail: '', tone: 'other' }
  }
  const { hostname, host } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { label: 'Local', detail: host, tone: 'local' }
  }
  if (hostname.endsWith('.vercel.app')) {
    return { label: 'Vercel', detail: host, tone: 'prod' }
  }
  return { label: 'Deployed', detail: host, tone: 'other' }
}
