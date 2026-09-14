export interface Term {
  termKr: string
  termEn: string
  explanationKr: string
  explanationEn: string
}

export interface Article {
  id: string
  titleKr: string
  titleEn: string
  imageUrl?: string
  summaryKr: string
  summaryEn: string
  terms: Term[]
  whyMattersKr: string
  whyMattersEn: string
  source: string
  sourceUrl: string
  publishedAt: string
  colorIndex: number
}

export interface DailyBriefing {
  date: string
  generatedAt: string
  articles: Article[]
}

// ─── 영어 학습(드래그 사전) ────────────────────────────────────────────

// 한 단어 / 숙어·구 / 문장 중 무엇을 긁었는지
export type LookupKind = 'word' | 'phrase' | 'sentence'

// en-ko: 영어를 긁었을 때(기본) / ko-en: 한국어를 긁어서 영어 표현을 물을 때
export type LookupDirection = 'en-ko' | 'ko-en'

export interface LookupSense {
  pos?: string | null
  meaningKr: string
  example?: string | null
  exampleKr?: string | null
}

export interface LookupResult {
  query: string
  kind: LookupKind
  direction: LookupDirection
  translation: string
  literal?: string | null
  pronunciation?: string | null
  senses: LookupSense[]
  note?: string | null
  synonyms?: string[]
  level?: string | null
}

export interface WordbookEntry {
  id: string
  query: string
  kind: LookupKind
  direction: LookupDirection
  translation: string
  pronunciation?: string | null
  meaningKr: string
  example?: string | null
  exampleKr?: string | null
  savedAt: string
}
