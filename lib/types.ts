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

// ─── 매일 미리 만들어 두는 사전(글로서리) ──────────────────────────────
// 오늘 브리핑 영어 본문에 실제로 나온 표현만 담는다. 여기서 맞으면 네트워크
// 없이 즉시 뜨고, 없으면 /api/lookup 으로 폴백한다.

export interface GlossaryWord {
  w: string          // 본문에 나온 표면형 (소문자). 예: "weighing"
  base?: string | null    // 원형. 표면형과 같으면 null. 예: "weigh"
  p?: string | null       // IPA 발음
  pos?: string | null     // 품사
  kr: string         // 표제어 뜻 (예: "경계하는, 조심하는")
  ctx?: string | null     // 이 기사에서 쓰인 뜻 한 줄
}

export interface GlossaryPhrase {
  w: string          // 본문에 나온 숙어·구동사 (소문자)
  kr: string
  note?: string | null
}

export interface GlossarySentence {
  en: string
  kr: string
}

export interface DailyGlossary {
  date: string       // 대상 브리핑 날짜
  generatedAt: string
  // 생성 로직/모델 버전. 코드가 바뀌면 올려서 그날 사전을 다시 만들게 한다.
  builder?: number
  words: GlossaryWord[]
  phrases: GlossaryPhrase[]
  sentences: GlossarySentence[]
}
