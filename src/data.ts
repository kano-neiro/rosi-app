// Моковые данные прототипа. В проде всё это приходит из админки и конфига шаблонов.
export type Product = 'ertegi' | 'boyamaq' | 'damu'
export type Gender = 'girl' | 'boy'
export type Age = '23' | '34' | '46'
export type Format = 'pdf' | 'print'

const m = (f: string) => `./m/${f}`

// Цены — заглушки из материалов, в проде хранятся в админке
export const PRICES: Record<Product, { pdf: number; print: number; printOld: number }> = {
  ertegi: { pdf: 490, print: 3900, printOld: 5900 },
  boyamaq: { pdf: 490, print: 3900, printOld: 5900 },
  damu: { pdf: 490, print: 1500, printOld: 2900 },
}
export const DELIVERY = { price: 1000, days: '3–5' }
export const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтөбе', 'Тараз', 'Павлодар', 'Өскемен']
export const PHOTO_DAYS = 30
export const FREE_REDOS = 2

export const PRODUCT_CARD: Record<Product, string> = {
  ertegi: m('aiaru_1.jpg'),
  boyamaq: m('bq_color_1.jpg'),
  damu: m('damu_cover.jpg'),
}

export const SHEET_PAGES: Record<Product, string[]> = {
  ertegi: [m('aiaru_1.jpg'), m('aiaru_3.jpg'), m('aiaru_4.jpg'), m('aiaru_8.jpg')],
  boyamaq: [m('bq_color_1.jpg'), m('bq_line_1.jpg'), m('bq_color_6.jpg'), m('bq_toc.jpg')],
  damu: [m('damu_23.jpg'), m('damu_34.jpg'), m('damu_46.jpg')],
}

export const GENDER_IMG: Record<Gender, string> = { girl: m('girl.jpg'), boy: m('boy.jpg') }

export type PreviewPage = { src: string; locked: boolean; cover?: boolean }

export function previewPages(p: Product, g: Gender, age: Age): PreviewPage[] {
  if (p === 'damu') {
    const c = age === '23' ? 'damu_23' : age === '34' ? 'damu_34' : 'damu_46'
    return [
      { src: m(`${c}.jpg`), locked: false, cover: true },
      ...['damu_23', 'damu_34', 'damu_46'].filter((x) => x !== c).map((x) => ({ src: m(`${x}_blur.jpg`), locked: true })),
    ]
  }
  if (p === 'ertegi' && g === 'girl') {
    return [
      { src: m('aiaru_1_clean.jpg'), locked: false, cover: true },
      { src: m('aiaru_2.jpg'), locked: false },
      ...[3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({ src: m(`aiaru_${i}_blur.jpg`), locked: true })),
    ]
  }
  if (p === 'boyamaq' && g === 'girl') {
    const rest: PreviewPage[] = []
    for (let i = 2; i <= 8; i++) rest.push({ src: m(`bq_color_${i}_blur.jpg`), locked: true }, { src: m(`bq_line_${i}_blur.jpg`), locked: true })
    return [
      { src: m('bq_color_1.jpg'), locked: false },
      { src: m('bq_line_1.jpg'), locked: false },
      { src: m('bq_line_1_blur.jpg'), locked: true },
      ...rest,
    ]
  }
  // мальчик: сказки для мальчика пока нет, показываем материалы Санжара
  return [
    { src: m('sanzhar_cover.jpg'), locked: false, cover: true },
    { src: m('sz_line_1.jpg'), locked: false },
    { src: m('sz_line_2_blur.jpg'), locked: true },
    { src: m('sanzhar_cover_blur.jpg'), locked: true },
  ]
}

export const WAIT_MEDIA = [
  { video: m('aidai_coloring.mp4'), poster: m('aidai_coloring_poster.jpg'), cap: 'wt.c1' },
  { video: m('aidai_reading.mp4'), poster: m('aidai_reading_poster.jpg'), cap: 'wt.c2' },
]

export const MEDIA = {
  welcomeVideo: m('razia_welcome.mp4'),
  welcomePoster: m('razia_welcome_poster.jpg'),
  avatar: m('razia_avatar.jpg'),
  gift: m('gift_pack.jpg'),
  books: m('books_photo.jpg'),
}
