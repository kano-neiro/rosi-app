// Склонение казахских имён по сингармонизму.
// Родительный (ілік): -ның/-нің после гласных и м, н, ң; -дың/-дің после р, л, й, у, з, ж; -тың/-тің после глухих и б, в, г, д.
// Дательный (барыс): -ға/-ге после гласных и звонких; -қа/-ке после глухих.
// Винительный (табыс): -ны/-ні после гласных; -ды/-ді после р, л, й, у, м, н, ң, з, ж; -ты/-ті после глухих.

export type NameForms = { nom: string; gen: string; dat: string; acc: string }

const BACK = 'аоұыяё'
const FRONT = 'әеөүіэи' // и в казахском читается как ій → мягкий ряд
const VOWELS = 'аоұыяёәеөүіэиую'
const SONOR_GEN = 'рлйузж' // -дың
const NASAL = 'мнң' // -ның (род.), -ды (вин.)
const VOICELESS = 'кқпстшфхцчщбвгдһ'

function isFront(word: string): boolean {
  const w = word.toLowerCase()
  for (let i = w.length - 1; i >= 0; i--) {
    const ch = w[i]
    if (BACK.includes(ch)) return false
    if (FRONT.includes(ch)) return true
  }
  return false
}

function lastKind(word: string): 'vowel' | 'sonor' | 'nasal' | 'voiceless' {
  const ch = word.toLowerCase().slice(-1)
  if (ch === 'у' || ch === 'и' || ch === 'ю') return 'sonor' // у, и, ю ведут себя как согласный (у → Айарудың)
  if (VOWELS.includes(ch)) return 'vowel'
  if (NASAL.includes(ch)) return 'nasal'
  if (SONOR_GEN.includes(ch)) return 'sonor'
  if (VOICELESS.includes(ch)) return 'voiceless'
  return 'sonor'
}

export function capitalize(s: string): string {
  const t = s.trim()
  return t ? t[0].toUpperCase() + t.slice(1) : t
}

export function declineName(raw: string): NameForms {
  const nom = capitalize(raw)
  if (!nom) return { nom: '', gen: '', dat: '', acc: '' }
  const f = isFront(nom)
  const k = lastKind(nom)
  const gen = nom + (k === 'vowel' || k === 'nasal' ? (f ? 'нің' : 'ның') : k === 'sonor' ? (f ? 'дің' : 'дың') : f ? 'тің' : 'тың')
  const dat = nom + (k === 'voiceless' ? (f ? 'ке' : 'қа') : f ? 'ге' : 'ға')
  const acc = nom + (k === 'vowel' ? (f ? 'ні' : 'ны') : k === 'voiceless' ? (f ? 'ті' : 'ты') : f ? 'ді' : 'ды')
  return { nom, gen, dat, acc }
}

export function validName(s: string): 'empty' | 'chars' | 'long' | null {
  const t = s.trim()
  if (!t) return 'empty'
  if (!/^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\- ]+$/.test(t)) return 'chars'
  if (t.length > 15) return 'long'
  return null
}
