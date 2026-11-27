// Тонкая обёртка над Telegram WebApp. В обычном браузере всё молча отключается.
type TG = {
  initData: string
  ready: () => void
  expand: () => void
  HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void; selectionChanged: () => void }
  BackButton?: { show: () => void; hide: () => void; onClick: (f: () => void) => void; offClick: (f: () => void) => void }
  initDataUnsafe?: { user?: { first_name?: string }; start_param?: string }
  setHeaderColor?: (c: string) => void
  setBackgroundColor?: (c: string) => void
  requestContact?: (cb: (ok: boolean, res?: unknown) => void) => void
}

export function tg(): TG | null {
  const w = window as unknown as { Telegram?: { WebApp?: TG } }
  const t = w.Telegram?.WebApp
  return t && t.initData ? t : null
}

export function loadTelegram(onReady: () => void) {
  const s = document.createElement('script')
  s.src = 'https://telegram.org/js/telegram-web-app.js'
  s.async = true
  s.onload = () => {
    const t = tg()
    if (t) {
      t.ready(); t.expand()
      t.setHeaderColor?.('#FFF7EC'); t.setBackgroundColor?.('#FFF7EC')
    }
    onReady()
  }
  s.onerror = () => onReady()
  document.head.appendChild(s)
}

export const haptic = {
  tap: () => tg()?.HapticFeedback?.impactOccurred('light'),
  select: () => tg()?.HapticFeedback?.selectionChanged(),
  ok: () => tg()?.HapticFeedback?.notificationOccurred('success'),
  err: () => tg()?.HapticFeedback?.notificationOccurred('error'),
}

export function startParam(): string {
  const t = tg()
  const fromTg = t?.initDataUnsafe?.start_param
  if (fromTg) return fromTg
  return new URLSearchParams(location.search).get('startapp') || 'direct'
}
