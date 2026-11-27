import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { tr } from './i18n'
import type { Lang } from './i18n'
import { declineName, validName } from './declension'
import type { NameForms } from './declension'
import {
  CITIES, DELIVERY, FREE_REDOS, GENDER_IMG, MEDIA, PHOTO_DAYS, PRICES, PRODUCT_CARD, SHEET_PAGES, WAIT_MEDIA, previewPages,
} from './data'
import type { Age, Format, Gender, Product } from './data'
import { haptic, startParam, tg } from './tg'

type Screen = 'welcome' | 'product' | 'hero' | 'name' | 'photo' | 'waiting' | 'preview' | 'format' | 'delivery' | 'payment' | 'thanks' | 'books'
type PhotoErr = 'noface' | 'many' | 'small' | 'dark' | 'side'
type PhotoStatus = 'idle' | 'checking' | 'ok' | PhotoErr
type BookStatus = 'drawing' | 'pdf' | 'accepted' | 'printing' | 'shipping' | 'delivered'
type Book = { id: string; product: Product; gender: Gender; age: Age; forms: NameForms; format: Format; status: BookStatus; cover: string; created: number }

type State = {
  lang: Lang; screen: Screen; history: Screen[]
  product: Product | null; gender: Gender | null; age: Age | null
  name: string; formsOverride: Partial<NameForms> | null
  photo: string | null; extras: string[]; consent: boolean
  redos: number; format: Format | null
  delivery: { name: string; phone: string; city: string; addr: string; note: string }
  books: Book[]; source: string
}

const KEY = 'rosi-proto-v1'
const initial: State = {
  lang: 'kk', screen: 'welcome', history: [], product: null, gender: null, age: null, name: '', formsOverride: null,
  photo: null, extras: [], consent: false, redos: FREE_REDOS, format: null,
  delivery: { name: '', phone: '', city: '', addr: '', note: '' }, books: [], source: 'direct',
}

function load(): State {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return { ...initial, ...JSON.parse(s) }
  } catch { /* ignore */ }
  return initial
}

const fmt = (n: number) => n.toLocaleString('ru-RU').replace(/,/g, ' ')

/* ---------------- small UI pieces ---------------- */

function Razia({ text }: { text: string }) {
  return (
    <div className="razia fade-up">
      <img src={MEDIA.avatar} alt="Разия" />
      <div className="bubble">{text}</div>
    </div>
  )
}

function Dots({ total, current, labels }: { total: number; current: number; labels: string[] }) {
  return (
    <div className="dots" aria-label={`${current + 1}/${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < current ? 'done' : i === current ? 'on' : ''} title={labels[i]} />
      ))}
    </div>
  )
}

function MainBtn({ label, onClick, disabled, loading }: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <div className="main-wrap">
      <button className="main-btn" disabled={disabled || loading} onClick={() => { haptic.tap(); onClick() }}>
        {loading ? <span className="spinner" /> : label}
      </button>
    </div>
  )
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  )
}

function Sparkles({ n = 18 }: { n?: number }) {
  const items = useMemo(() => Array.from({ length: n }).map((_, i) => ({
    left: Math.random() * 100, top: Math.random() * 60, d: Math.random() * 0.8, s: 10 + Math.random() * 14, k: i,
  })), [n])
  return (
    <div className="sparkles" aria-hidden>
      {items.map((it) => (
        <svg key={it.k} viewBox="0 0 24 24" style={{ left: `${it.left}%`, top: `${it.top}%`, width: it.s, height: it.s, animationDelay: `${it.d}s` }}>
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="#F2B33D" />
        </svg>
      ))}
    </div>
  )
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg viewBox="0 0 24 24" className="ic ok"><circle cx="12" cy="12" r="11" /><path d="M7 12.5l3.2 3.2L17 9" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" className="ic bad"><circle cx="12" cy="12" r="11" /><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" /></svg>
  )
}

function FaceIllo({ kind }: { kind: 'good' | 'side' | 'dark' | 'many' | 'glasses' }) {
  const skin = '#F6D3B5', hair = '#3A2353'
  const face = (cx: number, cy: number, r: number, turn = 0, glasses = false) => (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.05} rx={r} ry={r * 1.08} fill={skin} />
      <path d={`M${cx - r} ${cy} Q${cx} ${cy - r * 1.6} ${cx + r} ${cy} Q${cx + r * 0.6} ${cy - r * 0.6} ${cx} ${cy - r * 0.55} Q${cx - r * 0.6} ${cy - r * 0.6} ${cx - r} ${cy}`} fill={hair} />
      <circle cx={cx - r * 0.35 + turn} cy={cy + r * 0.1} r={r * 0.09} fill={hair} />
      {turn < r * 0.5 && <circle cx={cx + r * 0.35 + turn} cy={cy + r * 0.1} r={r * 0.09} fill={hair} />}
      <path d={`M${cx - r * 0.28 + turn} ${cy + r * 0.45} Q${cx + turn} ${cy + r * 0.68} ${cx + r * 0.28 + turn} ${cy + r * 0.45}`} stroke="#E2508C" strokeWidth={r * 0.08} fill="none" strokeLinecap="round" />
      {glasses && <g stroke={hair} strokeWidth={r * 0.07} fill="none"><circle cx={cx - r * 0.35} cy={cy + r * 0.1} r={r * 0.24} /><circle cx={cx + r * 0.35} cy={cy + r * 0.1} r={r * 0.24} /><path d={`M${cx - r * 0.11} ${cy + r * 0.1}h${r * 0.22}`} /></g>}
    </g>
  )
  return (
    <svg viewBox="0 0 100 100" className="illo">
      <rect width="100" height="100" rx="18" fill={kind === 'dark' ? '#6b5a73' : '#FDEBD9'} />
      {kind === 'good' && face(50, 52, 26)}
      {kind === 'side' && face(50, 52, 26, 14)}
      {kind === 'dark' && <g opacity="0.45">{face(50, 52, 26)}</g>}
      {kind === 'many' && <>{face(30, 55, 15)}{face(70, 55, 15)}{face(50, 45, 13)}</>}
      {kind === 'glasses' && face(50, 52, 26, 0, true)}
    </svg>
  )
}

/* ---------------- App ---------------- */

export default function App() {
  const [s, setS] = useState<State>(() => ({ ...load(), source: startParam() }))
  const [sheet, setSheet] = useState<Product | null>(null)
  const [terms, setTerms] = useState(false)
  const [protoMenu, setProtoMenu] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const t = (k: string, v?: Record<string, string | number>) => tr(s.lang, k, v)
  const up = (p: Partial<State>) => setS((o) => ({ ...o, ...p }))

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* quota */ } }, [s])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [s.screen])

  const forms: NameForms = useMemo(() => ({ ...declineName(s.name), ...(s.formsOverride || {}) }), [s.name, s.formsOverride])

  const go = (screen: Screen) => setS((o) => ({ ...o, screen, history: [...o.history, o.screen] }))
  const back = () => setS((o) => {
    const h = [...o.history]
    let prev = h.pop() || 'welcome'
    while (prev === 'waiting' && h.length) prev = h.pop()!
    return { ...o, screen: prev, history: h }
  })

  // Telegram native BackButton
  useEffect(() => {
    const b = tg()?.BackButton
    if (!b) return
    if (s.screen === 'welcome' || s.screen === 'thanks') b.hide(); else b.show()
    b.onClick(back)
    return () => b.offClick(back)
  })

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200) }

  // simulate PDF readiness for fresh pdf books
  useEffect(() => {
    const pending = s.books.filter((b) => b.status === 'drawing')
    if (!pending.length) return
    const id = setTimeout(() => {
      setS((o) => ({ ...o, books: o.books.map((b) => (b.status === 'drawing' ? { ...b, status: 'pdf' } : b)) }))
      haptic.ok(); showToast(tr(s.lang, 'b.pdfReady'))
    }, 7000)
    return () => clearTimeout(id)
  }, [s.books, s.lang])

  const isDamu = s.product === 'damu'
  const flow: Screen[] = isDamu ? ['product', 'hero', 'name', 'preview'] : ['product', 'hero', 'name', 'photo', 'preview']
  const dotLabels = isDamu ? ['dots.product', 'dots.hero', 'dots.name', 'dots.preview'] : ['dots.product', 'dots.hero', 'dots.name', 'dots.photo', 'dots.preview']
  const dotIndex = s.screen === 'waiting' ? 3 : flow.indexOf(s.screen)
  const showDots = dotIndex >= 0

  const header = (
    <header className="top">
      {s.screen !== 'welcome' && s.screen !== 'thanks' && !tg() ? (
        <button className="back" onClick={() => { haptic.select(); back() }} aria-label={t('back')}>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      ) : <span className="back-ph" />}
      {showDots ? <Dots total={flow.length} current={dotIndex} labels={dotLabels.map((k) => t(k))} /> : <span />}
      <div className="top-right">
        <button className="lang" onClick={() => { haptic.select(); up({ lang: s.lang === 'kk' ? 'ru' : 'kk' }) }}>{s.lang === 'kk' ? 'РУС' : 'ҚАЗ'}</button>
        <button className="proto-btn" onClick={() => setProtoMenu(true)} title="Прототип: все экраны">⋯</button>
      </div>
    </header>
  )

  let body: ReactNode = null
  let main: ReactNode = null

  /* ---------- 1. Welcome ---------- */
  if (s.screen === 'welcome') {
    body = <Welcome t={t} lang={s.lang} hasBooks={s.books.length > 0} onBooks={() => go('books')} />
    main = <MainBtn label={t('w.cta')} onClick={() => go('product')} />
  }

  /* ---------- 2. Product ---------- */
  if (s.screen === 'product') {
    const cards: Product[] = ['ertegi', 'boyamaq', 'damu']
    body = (
      <>
        <Razia text={t('p.razia')} />
        <h1 className="fade-up">{t('p.title')}</h1>
        <div className="cards">
          {cards.map((p, i) => (
            <button key={p} className={`pcard fade-up ${s.product === p ? 'sel' : ''}`} style={{ animationDelay: `${0.06 * i}s` }}
              onClick={() => { haptic.tap(); setSheet(p) }}>
              <img src={PRODUCT_CARD[p]} alt="" />
              <div className="pc-text">
                <b>{t(`p.${p}`)}</b>
                <span>{t(`p.${p}.line`)}</span>
                <em className="chip">{t('p.from', { price: fmt(PRICES[p].pdf) })}</em>
              </div>
              <svg viewBox="0 0 24 24" className="chev"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </>
    )
  }

  /* ---------- 3. Hero / Age ---------- */
  if (s.screen === 'hero') {
    if (isDamu) {
      const ages: Age[] = ['23', '34', '46']
      body = (
        <>
          <Razia text={t('a.razia')} />
          <h1 className="fade-up">{t('a.title')}</h1>
          <div className="ages">
            {ages.map((a, i) => (
              <button key={a} className={`age fade-up ${s.age === a ? 'sel' : ''}`} style={{ animationDelay: `${0.06 * i}s` }}
                onClick={() => { haptic.tap(); up({ age: a }); setTimeout(() => go('name'), 180) }}>
                <b>{t(`a.${a}`)}</b>{a === '46' && <span>{t('a.46.sub')}</span>}
              </button>
            ))}
          </div>
        </>
      )
    } else {
      body = (
        <>
          <Razia text={t('g.razia')} />
          <h1 className="fade-up">{t('g.title')}</h1>
          <div className="genders">
            {(['girl', 'boy'] as Gender[]).map((g, i) => (
              <button key={g} className={`gcard fade-up ${s.gender === g ? 'sel' : ''}`} style={{ animationDelay: `${0.06 * i}s` }}
                onClick={() => { haptic.tap(); up({ gender: g }); setTimeout(() => go('name'), 180) }}>
                <img src={GENDER_IMG[g]} alt="" />
                <b>{t(`g.${g}`)}</b>
              </button>
            ))}
          </div>
        </>
      )
    }
  }

  /* ---------- 4. Name ---------- */
  if (s.screen === 'name') {
    body = <NameStep t={t} name={s.name} forms={forms} product={s.product || 'ertegi'} hasOverride={!!s.formsOverride}
      onName={(name) => up({ name, formsOverride: null })} onForms={(f) => up({ formsOverride: f })} />
    const err = validName(s.name)
    main = <MainBtn label={t('cont')} disabled={!!err} onClick={() => go(isDamu ? 'preview' : 'photo')} />
  }

  /* ---------- 5. Photo ---------- */
  if (s.screen === 'photo') {
    body = <PhotoStep t={t} s={s} forms={forms} up={up} onTerms={() => setTerms(true)} />
    main = <MainBtn label={t('ph.cta')} disabled={!s.photo || !s.consent || !(window as unknown as { __photoOk?: boolean }).__photoOk}
      onClick={() => go('waiting')} />
  }

  /* ---------- 6. Waiting ---------- */
  if (s.screen === 'waiting') {
    body = <Waiting t={t} forms={forms} onDone={() => { haptic.ok(); setS((o) => ({ ...o, screen: 'preview' })) }} />
  }

  /* ---------- 7. Preview ---------- */
  if (s.screen === 'preview') {
    body = <Preview t={t} s={s} forms={forms}
      onRedo={() => { if (s.redos > 0) { up({ redos: s.redos - 1 }); go('waiting') } }}
      onNewPhoto={() => go('photo')} />
    main = <MainBtn label={t('pv.cta')} onClick={() => go('format')} />
  }

  /* ---------- 8. Format ---------- */
  if (s.screen === 'format') {
    const pr = PRICES[s.product || 'ertegi']
    body = (
      <>
        <Razia text={t('f.razia')} />
        <h1 className="fade-up">{t('f.title')}</h1>
        <div className="formats">
          <button className={`fcard fade-up ${s.format === 'pdf' ? 'sel' : ''}`} onClick={() => { haptic.select(); up({ format: 'pdf' }) }}>
            <div className="f-ic"><svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 14h6M10 17h4" /></svg></div>
            <div className="f-body"><b>{t('f.pdf')}</b><span>{t('f.pdf.line')}</span><div className="price">{fmt(pr.pdf)} ₸</div></div>
            <span className="radio" />
          </button>
          <button className={`fcard fade-up ${s.format === 'print' ? 'sel' : ''}`} style={{ animationDelay: '.06s' }} onClick={() => { haptic.select(); up({ format: 'print' }) }}>
            <img className="f-img" src={MEDIA.gift} alt="" />
            <div className="f-body"><b>{t('f.print')}</b><span>{t('f.print.line')}</span>
              <div className="price">{fmt(pr.print)} ₸ <s>{fmt(pr.printOld)} ₸</s> <em className="chip promo">{t('promo')}</em></div></div>
            <span className="radio" />
          </button>
        </div>
      </>
    )
    main = <MainBtn label={s.format === 'print' ? t('cont') : t('f.toPay')} disabled={!s.format} onClick={() => go(s.format === 'print' ? 'delivery' : 'payment')} />
  }

  /* ---------- 9. Delivery ---------- */
  if (s.screen === 'delivery') {
    const d = s.delivery
    const setD = (p: Partial<State['delivery']>) => up({ delivery: { ...d, ...p } })
    const cityBad = d.city === '__other'
    const ok = d.name.trim() && d.phone.trim().length >= 10 && d.city && !cityBad && d.addr.trim().length > 4
    body = (
      <>
        <Razia text={t('d.razia')} />
        <h1 className="fade-up">{t('d.title')}</h1>
        <div className="form fade-up">
          <label>{t('d.name')}<input value={d.name} onChange={(e) => setD({ name: e.target.value })} placeholder={tg()?.initDataUnsafe?.user?.first_name || 'Айгүл'} /></label>
          <label>{t('d.phone')}
            <div className="row">
              <input inputMode="tel" value={d.phone} onChange={(e) => setD({ phone: e.target.value })} placeholder="+7 ___ ___ __ __" />
              <button className="share" onClick={() => { haptic.tap(); const tgx = tg(); if (tgx?.requestContact) tgx.requestContact(() => {}); else setD({ phone: '+7 777 123 45 67' }) }}>
                <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>{t('d.share')}
              </button>
            </div>
          </label>
          <label>{t('d.city')}
            <select value={d.city} onChange={(e) => setD({ city: e.target.value })}>
              <option value="" disabled>—</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__other">{t('d.otherCity')}</option>
            </select>
          </label>
          {cityBad && <div className="err">{t('d.e.city')}</div>}
          <label>{t('d.addr')}<input value={d.addr} onChange={(e) => setD({ addr: e.target.value })} placeholder={t('d.addr.ph')} /></label>
          <label>{t('d.note')}<input value={d.note} onChange={(e) => setD({ note: e.target.value })} /></label>
          <div className="info">{t('d.info', { price: fmt(DELIVERY.price), days: DELIVERY.days })}</div>
        </div>
      </>
    )
    main = <MainBtn label={t('f.toPay')} disabled={!ok} onClick={() => go('payment')} />
  }

  /* ---------- 10. Payment ---------- */
  if (s.screen === 'payment') {
    body = <Payment t={t} s={s} forms={forms} />
    const pr = PRICES[s.product || 'ertegi']
    const total = s.format === 'print' ? pr.print + DELIVERY.price : pr.pdf
    main = <PayBtn label={t('pay.cta', { total: fmt(total) })} onPaid={() => {
      haptic.ok()
      const book: Book = {
        id: Math.random().toString(36).slice(2, 8), product: s.product || 'ertegi', gender: s.gender || 'girl', age: s.age || '34', forms,
        format: s.format || 'pdf', status: s.format === 'print' ? 'accepted' : 'drawing',
        cover: previewPages(s.product || 'ertegi', s.gender || 'girl', s.age || '34')[0].src, created: Date.now(),
      }
      setS((o) => ({ ...o, books: [book, ...o.books], screen: 'thanks', history: [] }))
    }} />
  }

  /* ---------- 11. Thanks ---------- */
  if (s.screen === 'thanks') {
    body = (
      <div className="thanks">
        <Sparkles n={24} />
        <h1 className="fade-up big">{t('ty.title')}</h1>
        <div className="letter fade-up">
          <img src={MEDIA.avatar} alt="Разия" />
          <p>{t('ty.letter', { name: forms.nom || 'Айдай' })}</p>
          <i>— {t('ty.sign')}</i>
        </div>
        <div className="status-note fade-up">{s.format === 'print' ? t('ty.print') : t('ty.pdf')}</div>
      </div>
    )
    main = <MainBtn label={t('myBooks')} onClick={() => setS((o) => ({ ...o, screen: 'books', history: ['welcome'] }))} />
  }

  /* ---------- 12. Books ---------- */
  if (s.screen === 'books') {
    body = <Books t={t} s={s} setS={setS} showToast={showToast} />
    main = <MainBtn label={t('b.another')} onClick={() => setS((o) => ({
      ...o, screen: 'product', history: ['books'], product: null, gender: null, age: null, name: '', formsOverride: null,
      photo: null, extras: [], consent: false, redos: FREE_REDOS, format: null,
    }))} />
  }

  return (
    <div className="app">
      <div className="blobs" aria-hidden><i /><i /><i /></div>
      {header}
      <main key={s.screen} className={`screen s-${s.screen}`}>{body}</main>
      {main}
      <Sheet open={!!sheet} onClose={() => setSheet(null)}>
        {sheet && (
          <div className="sheet-body">
            <h2>{t(`p.${sheet}`)}</h2>
            <div className="meta">{t(`sh.meta.${sheet}`)}</div>
            <div className="carousel">
              {SHEET_PAGES[sheet].map((src) => <img key={src} src={src} alt="" />)}
            </div>
            <div className="swipe">{t('sh.swipe')}</div>
            <p>{t(`sh.${sheet}`)}</p>
            <button className="main-btn" onClick={() => {
              haptic.tap(); const p = sheet; setSheet(null)
              setS((o) => ({ ...o, product: p, gender: o.product === p ? o.gender : null, age: o.product === p ? o.age : null, screen: 'hero', history: [...o.history, o.screen] }))
            }}>{t('sh.cta')}</button>
          </div>
        )}
      </Sheet>
      <Sheet open={terms} onClose={() => setTerms(false)}>
        <div className="sheet-body"><h2>{t('ph.terms')}</h2><p>{t('ph.termsText', { days: PHOTO_DAYS })}</p>
          <button className="main-btn" onClick={() => setTerms(false)}>OK</button></div>
      </Sheet>
      {toast && <div className="toast">{toast}</div>}
      <Sheet open={protoMenu} onClose={() => setProtoMenu(false)}>
        <div className="sheet-body proto">
          <h2>Прототип · экраны</h2>
          <div className="proto-grid">
            {(['welcome', 'product', 'hero', 'name', 'photo', 'waiting', 'preview', 'format', 'delivery', 'payment', 'thanks', 'books'] as Screen[]).map((sc, i) => (
              <button key={sc} onClick={() => {
                setProtoMenu(false)
                setS((o) => ({
                  ...o, screen: sc, history: sc === 'welcome' ? [] : ['welcome'],
                  product: o.product || 'ertegi', gender: o.gender || 'girl', age: o.age || '34', name: o.name || 'Айдай',
                  format: o.format || (sc === 'delivery' ? 'print' : 'pdf'),
                }))
              }}>{i + 1}. {sc}</button>
            ))}
          </div>
          <p className="small">Источник (метка startapp): <b>{s.source}</b>. Данные моковые, цены — заглушки из материалов.</p>
          <button className="ghost" onClick={() => { localStorage.removeItem(KEY); setS({ ...initial, source: s.source }); setProtoMenu(false) }}>Сбросить всё</button>
        </div>
      </Sheet>
    </div>
  )
}

/* ---------------- Screens ---------------- */

type T = (k: string, v?: Record<string, string | number>) => string

function Welcome({ t, lang, hasBooks, onBooks }: { t: T; lang: Lang; hasBooks: boolean; onBooks: () => void }) {
  const [sub, setSub] = useState(0)
  const v = useRef<HTMLVideoElement>(null)
  useEffect(() => { v.current?.play().catch(() => {}) }, [])
  return (
    <div className="welcome">
      <div className="video-card fade-up">
        <video ref={v} src={MEDIA.welcomeVideo} poster={MEDIA.welcomePoster} autoPlay muted loop playsInline
          onTimeUpdate={(e) => setSub(e.currentTarget.currentTime < 3.3 ? 0 : 1)} />
        <div className="subs" key={sub + lang}>{t(sub === 0 ? 'w.sub1' : 'w.sub2')}</div>
      </div>
      <h1 className="fade-up" style={{ animationDelay: '.08s' }}>{t('w.title')}</h1>
      <p className="lead fade-up" style={{ animationDelay: '.12s' }}>{t('w.text')}</p>
      <div className="note fade-up" style={{ animationDelay: '.16s' }}>
        <svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>{t('w.note')}
      </div>
      {hasBooks && <button className="link fade-up" onClick={onBooks}>{t('myBooks')} →</button>}
    </div>
  )
}

function CoverMini({ product, gen }: { product: Product; gen: string }) {
  const title = product === 'ertegi' ? `${gen} ертегісі` : product === 'boyamaq' ? `${gen} ертегі боямағы` : `${gen} даму әлемі`
  return (
    <div className={`cover-mini c-${product}`}>
      <div className="cm-stars">✦ ✧ ✦</div>
      <div className="cm-title">{gen ? title : '…'}</div>
      <div className="cm-sub">Rosi · Разия Ержанова</div>
    </div>
  )
}

function NameStep({ t, name, forms, product, hasOverride, onName, onForms }: {
  t: T; name: string; forms: NameForms; product: Product; hasOverride: boolean; onName: (s: string) => void; onForms: (f: Partial<NameForms>) => void
}) {
  const [fix, setFix] = useState(hasOverride)
  const [touched, setTouched] = useState(false)
  const err = validName(name)
  return (
    <>
      <Razia text={t('n.razia')} />
      <h1 className="fade-up">{t('n.title')}</h1>
      <input className="big-input fade-up" value={name} placeholder={t('n.ph')} autoComplete="off" maxLength={20}
        onChange={(e) => { setTouched(true); onName(e.target.value) }} onBlur={() => setTouched(true)} />
      {touched && err && <div className="err">{t(`n.err.${err}`)}</div>}
      <CoverMini product={product} gen={forms.gen} />
      {!err && (
        <div className="forms fade-up">
          <div className="forms-h">{t('n.forms')}</div>
          {!fix ? (
            <>
              <div className="forms-row"><span>{forms.nom}</span><span>{forms.gen}</span><span>{forms.dat}</span><span>{forms.acc}</span></div>
              <button className="link" onClick={() => setFix(true)}>{t('n.fix')}</button>
            </>
          ) : (
            <div className="forms-edit">
              {(['gen', 'dat', 'acc'] as const).map((k) => (
                <label key={k}><span>{t(`n.${k}`)}</span>
                  <input value={forms[k]} onChange={(e) => onForms({ [k]: e.target.value })} /></label>
              ))}
              <button className="link" onClick={() => setFix(false)}>{t('n.done')}</button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function PhotoStep({ t, s, forms, up, onTerms }: { t: T; s: State; forms: NameForms; up: (p: Partial<State>) => void; onTerms: () => void }) {
  const [status, setStatus] = useState<PhotoStatus>(s.photo ? 'ok' : 'idle')
  const [demoErr, setDemoErr] = useState<PhotoErr | ''>('')
  const cam = useRef<HTMLInputElement>(null)
  const gal = useRef<HTMLInputElement>(null)
  const extra = useRef<HTMLInputElement>(null)
  ;(window as unknown as { __photoOk?: boolean }).__photoOk = status === 'ok'

  const readFile = (f: File, cb: (url: string, w: number, h: number) => void) => {
    const r = new FileReader()
    r.onload = () => {
      const img = new Image()
      img.onload = () => {
        // уменьшаем, чтобы не раздувать localStorage
        const k = Math.min(1, 900 / Math.max(img.width, img.height))
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        cb(c.toDataURL('image/jpeg', 0.82), img.width, img.height)
      }
      img.src = String(r.result)
    }
    r.readAsDataURL(f)
  }
  const onPick = (f?: File) => {
    if (!f) return
    readFile(f, (url, w, h) => {
      up({ photo: url }); setStatus('checking')
      setTimeout(() => {
        const e: PhotoStatus = demoErr || (Math.min(w, h) < 300 ? 'small' : 'ok')
        setStatus(e); if (e === 'ok') haptic.ok(); else haptic.err()
      }, 1400)
    })
  }
  const isErr = status !== 'idle' && status !== 'checking' && status !== 'ok'
  return (
    <>
      <Razia text={t('ph.razia')} />
      <h1 className="fade-up">{s.lang === 'kk' ? t('ph.title', { gen: forms.gen }) : t('ph.title', { name: forms.nom })}</h1>
      {!s.photo || isErr ? (
        <div className="tips fade-up">
          <div className="tip-col">
            <div className="tip-h"><Check ok />{t('ph.good')}</div>
            <FaceIllo kind="good" />
          </div>
          <div className="tip-col">
            <div className="tip-h"><Check ok={false} />{t('ph.bad')}</div>
            <div className="bad-grid"><FaceIllo kind="side" /><FaceIllo kind="dark" /><FaceIllo kind="many" /><FaceIllo kind="glasses" /></div>
          </div>
          <ul className="rules">
            {['ph.r1', 'ph.r2', 'ph.r3', 'ph.r4', 'ph.r5'].map((k) => <li key={k}><Check ok />{t(k)}</li>)}
          </ul>
        </div>
      ) : null}
      {s.photo && (
        <div className={`photo-box fade-up ${status}`}>
          <img src={s.photo} alt="" />
          <div className="photo-status">
            {status === 'checking' && <><span className="spinner dark" />{t('ph.checking')}</>}
            {status === 'ok' && <><Check ok />{t('ph.ok')}</>}
            {isErr && <><Check ok={false} />{t(`ph.e.${status}`)}</>}
          </div>
        </div>
      )}
      <div className="pick fade-up">
        <button onClick={() => { haptic.tap(); cam.current?.click() }}>
          <svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>{s.photo ? t('ph.change') : t('ph.camera')}
        </button>
        <button onClick={() => { haptic.tap(); gal.current?.click() }}>
          <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><circle cx="9" cy="9" r="1.6" /><path d="M20 15l-5-5-9 9" /></svg>{t('ph.gallery')}
        </button>
        <input ref={cam} type="file" accept="image/*" capture="user" hidden onChange={(e) => onPick(e.target.files?.[0])} />
        <input ref={gal} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      </div>
      {status === 'ok' && (
        <div className="extras fade-up">
          <div className="ex-h">{t('ph.extra')} <span>· {t('ph.optional')}</span></div>
          <div className="ex-row">
            {s.extras.map((x, i) => <img key={i} src={x} alt="" onClick={() => up({ extras: s.extras.filter((_, j) => j !== i) })} />)}
            {s.extras.length < 3 && <button onClick={() => extra.current?.click()}>{t('ph.add')}</button>}
          </div>
          <input ref={extra} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f, (u) => up({ extras: [...s.extras, u] })) }} />
        </div>
      )}
      <label className="consent fade-up">
        <input type="checkbox" checked={s.consent} onChange={(e) => { haptic.select(); up({ consent: e.target.checked }) }} />
        <span className="box" />
        <span>{t('ph.consent')} <button className="link inline" onClick={(e) => { e.preventDefault(); onTerms() }}>{t('ph.terms')}</button></span>
      </label>
      <div className="demo">
        <span>Демо проверки:</span>
        <select value={demoErr} onChange={(e) => setDemoErr(e.target.value as PhotoErr | '')}>
          <option value="">фото подходит</option>
          <option value="noface">лицо не найдено</option>
          <option value="many">несколько лиц</option>
          <option value="small">лицо маленькое</option>
          <option value="dark">темно / размыто</option>
          <option value="side">голова повёрнута</option>
        </select>
      </div>
    </>
  )
}

function BookDraw() {
  return (
    <svg viewBox="0 0 200 140" className="bookdraw">
      <path className="d1" d="M100 30 C80 18 45 16 18 24 V120 C45 112 80 114 100 126 Z" />
      <path className="d1" d="M100 30 C120 18 155 16 182 24 V120 C155 112 120 114 100 126 Z" />
      <path className="d2" d="M34 50 C50 44 70 44 86 50 M34 66 C50 60 70 60 86 66 M34 82 C50 76 66 76 78 80" />
      <circle className="d3" cx="140" cy="62" r="16" />
      <path className="d3" d="M122 104 C130 88 150 88 158 104" />
      <path className="d4" d="M150 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
    </svg>
  )
}

function Waiting({ t, forms, onDone }: { t: T; forms: NameForms; onDone: () => void }) {
  const [p, setP] = useState(0)
  useEffect(() => {
    const start = Date.now(), D = 9000
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / D); setP(k)
      if (k >= 1) { clearInterval(id); setTimeout(onDone, 300) }
    }, 80)
    return () => clearInterval(id)
  }, [])
  const step = p < 0.25 ? 1 : p < 0.6 ? 2 : p < 0.9 ? 3 : 4
  return (
    <div className="waiting">
      <BookDraw />
      <h1 className="fade-up">{t('wt.title', { gen: forms.gen, name: forms.nom })}</h1>
      <div className="bar"><i style={{ width: `${p * 100}%` }} /></div>
      <div className="wsteps">
        {[1, 2, 3, 4].map((i) => <div key={i} className={i < step ? 'done' : i === step ? 'on' : ''}>{i < step ? '✓' : '•'} {t(`wt.s${i}`)}</div>)}
      </div>
      <div className="wtime">{t('wt.time')}</div>
      <div className="wfeed">
        <Razia text={t('wt.razia')} />
        <div className="vrow">
          {WAIT_MEDIA.map((m) => (
            <figure key={m.video}><video src={m.video} poster={m.poster} autoPlay muted loop playsInline /><figcaption>{t(m.cap)}</figcaption></figure>
          ))}
        </div>
        <div className="reviews">
          <div className="rv-h">{t('wt.c3')} <em className="chip">{t('wt.sample')}</em></div>
          <blockquote>{t('wt.rev1')}</blockquote>
          <blockquote>{t('wt.rev2')}</blockquote>
        </div>
      </div>
      <div className="wclose">{t('wt.close')}</div>
    </div>
  )
}

function Preview({ t, s, forms, onRedo, onNewPhoto }: { t: T; s: State; forms: NameForms; onRedo: () => void; onNewPhoto: () => void }) {
  const pages = previewPages(s.product || 'ertegi', s.gender || 'girl', s.age || '34')
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const onScroll = () => { const el = ref.current; if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth)) }
  const product = s.product || 'ertegi'
  const title = t(`cover.${product}`, { gen: forms.gen })
  const isDamu = product === 'damu'
  return (
    <div className="preview">
      <Sparkles />
      <h1 className="fade-up">{t('pv.title', { gen: forms.gen, name: forms.nom })}</h1>
      <Razia text={t('pv.razia')} />
      <div className="pages" ref={ref} onScroll={onScroll}>
        {pages.map((pg, i) => (
          <div key={i} className={`page ${pg.locked ? 'locked' : ''}`}>
            <div className="pg-inner">
              <img src={pg.src} alt="" />
              {pg.cover && <div className={`cover-title ct-${product} ct-${s.gender}`}>{title}</div>}
              {pg.cover && product === 'ertegi' && s.gender === 'girl' && <div className="cover-ribbon">Жаңа жылыңмен, {forms.nom}!</div>}
            </div>
            {pg.locked && (
              <div className="lock">
                <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                <span>{t('pv.locked')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="pcount">{t('pv.page', { n: idx + 1, total: pages.length })}</div>
      {!isDamu && (
        <div className="pv-actions">
          {s.redos > 0 ? (
            <button className="link" onClick={onRedo}>{t('pv.redo')} <span>· {t('pv.redoLeft', { n: s.redos })}</span></button>
          ) : (
            <div className="limit">{t('pv.limit')} <button className="link inline">{t('pv.write')}</button></div>
          )}
          <button className="link" onClick={onNewPhoto}>{t('pv.newPhoto')}</button>
        </div>
      )}
    </div>
  )
}

function Payment({ t, s, forms }: { t: T; s: State; forms: NameForms }) {
  const product = s.product || 'ertegi'
  const pr = PRICES[product]
  const isPrint = s.format === 'print'
  const price = isPrint ? pr.print : pr.pdf
  const total = isPrint ? price + DELIVERY.price : price
  return (
    <>
      <h1 className="fade-up">{t('pay.title')}</h1>
      <div className="summary fade-up">
        <img src={previewPages(product, s.gender || 'girl', s.age || '34')[0].src} alt="" />
        <div>
          <b>{t(`cover.${product}`, { gen: forms.gen })}</b>
          <span>{isPrint ? t('f.print') : t('f.pdf')}</span>
        </div>
        <div className="sum-price">{fmt(price)} ₸</div>
      </div>
      {isPrint && <div className="sum-row fade-up"><span>{t('pay.delivery')} · {s.delivery.city}</span><span>{fmt(DELIVERY.price)} ₸</span></div>}
      <div className="sum-row total fade-up"><span>{t('pay.total')}</span><span>{fmt(total)} ₸</span></div>
      <div className="small center">{t('pay.method')}</div>
    </>
  )
}

function PayBtn({ label, onPaid }: { label: string; onPaid: () => void }) {
  const [loading, setLoading] = useState(false)
  return <MainBtn label={label} loading={loading} onClick={() => { setLoading(true); setTimeout(onPaid, 1500) }} />
}

function Books({ t, s, setS, showToast }: { t: T; s: State; setS: React.Dispatch<React.SetStateAction<State>>; showToast: (m: string) => void }) {
  const [del, setDel] = useState<string | null>(null)
  const statusOrder: BookStatus[] = ['accepted', 'printing', 'shipping', 'delivered']
  return (
    <>
      <h1 className="fade-up">{t('b.title')}</h1>
      {s.books.length === 0 && (
        <div className="empty fade-up">
          <img src={MEDIA.books} alt="" />
          <p>{t('b.empty')}</p>
        </div>
      )}
      <div className="books">
        {s.books.map((b) => {
          const st = b.status === 'drawing' ? 'st.drawing' : b.status === 'pdf' ? 'st.pdf' : `st.${b.status}`
          return (
            <div key={b.id} className="book fade-up">
              <img src={b.cover} alt="" />
              <div className="bk-body">
                <b>{t(`cover.${b.product}`, { gen: b.forms.gen })}</b>
                <span>{b.format === 'print' ? t('f.print') : t('f.pdf')}</span>
                <em className={`chip st-${b.status}`}>{t(st)}</em>
                {b.format === 'print' && (
                  <div className="track">
                    {statusOrder.map((x) => <i key={x} className={statusOrder.indexOf(x) <= statusOrder.indexOf(b.status) ? 'on' : ''} title={t(`st.${x}`)} />)}
                  </div>
                )}
                <div className="bk-act">
                  {b.status === 'pdf' && <button onClick={() => showToast('PDF → Telegram')}>{t('b.download')}</button>}
                  {b.format === 'print' && b.status !== 'delivered' && (
                    <button className="ghost" title="демо: следующий статус" onClick={() => setS((o) => ({
                      ...o, books: o.books.map((x) => x.id === b.id ? { ...x, status: statusOrder[Math.min(3, statusOrder.indexOf(x.status) + 1)] } : x),
                    }))}>демо: статус →</button>
                  )}
                  <button className="ghost danger" onClick={() => setDel(b.id)}>{t('b.delete')}</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <button className="share-btn fade-up" onClick={() => {
        haptic.tap()
        const link = `https://t.me/rosi_ertegi_bot?startapp=ref_demo`
        const text = `${t('b.shareText')} ${link}`
        if (navigator.share) navigator.share({ text }).catch(() => {})
        else navigator.clipboard?.writeText(text).then(() => showToast(t('b.copied')))
      }}>
        <svg viewBox="0 0 24 24"><path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5" /></svg>{t('b.share')}
      </button>
      <Sheet open={!!del} onClose={() => setDel(null)}>
        <div className="sheet-body">
          <p className="center">{t('b.confirm')}</p>
          <button className="main-btn danger" onClick={() => { setS((o) => ({ ...o, books: o.books.filter((x) => x.id !== del) })); setDel(null) }}>{t('b.yes')}</button>
          <button className="ghost wide" onClick={() => setDel(null)}>{t('b.no')}</button>
        </div>
      </Sheet>
    </>
  )
}
