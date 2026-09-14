'use client'

import { normalizeIpa } from './lookupShared'
import { DailyGlossary, LookupResult } from './types'

// 미리 만들어 둔 사전을 조회하기 좋은 형태로 바꾸고, 드래그한 표현을 맞춰 본다.
// 여기서 맞으면 네트워크 없이 즉시 뜬다 — 단어 조회의 지연이 사라지는 지점.

const CACHE_KEY = 'study.glossary.v1'

export interface GlossaryIndex {
  date: string
  words: Map<string, LookupResult>
  phrases: Map<string, LookupResult>
  sentences: Map<string, LookupResult>
  size: number
}

// 사전 키와 드래그한 텍스트를 같은 규칙으로 납작하게 만든다
function key(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/^[^a-z0-9']+|[^a-z0-9'%]+$/g, '')
    .trim()
}

export function buildGlossaryIndex(glossary: DailyGlossary): GlossaryIndex {
  const words = new Map<string, LookupResult>()
  for (const entry of glossary.words ?? []) {
    const senses = entry.ctx
      ? [{ pos: entry.pos ?? null, meaningKr: entry.ctx }]
      : [{ pos: entry.pos ?? null, meaningKr: entry.kr }]
    words.set(key(entry.w), {
      query: entry.w,
      kind: 'word',
      direction: 'en-ko',
      translation: entry.kr,
      literal: null,
      pronunciation: normalizeIpa(entry.p),
      senses,
      note: entry.base && entry.base !== entry.w ? `원형은 ${entry.base} 예요.` : null,
      synonyms: [],
      level: null,
    })
  }

  const phrases = new Map<string, LookupResult>()
  for (const entry of glossary.phrases ?? []) {
    phrases.set(key(entry.w), {
      query: entry.w,
      kind: 'phrase',
      direction: 'en-ko',
      translation: entry.kr,
      literal: null,
      pronunciation: null,
      senses: entry.note ? [{ pos: null, meaningKr: entry.note }] : [],
      note: null,
      synonyms: [],
      level: null,
    })
  }

  const sentences = new Map<string, LookupResult>()
  for (const entry of glossary.sentences ?? []) {
    sentences.set(key(entry.en), {
      query: entry.en,
      kind: 'sentence',
      direction: 'en-ko',
      translation: entry.kr,
      literal: null,
      pronunciation: null,
      senses: [],
      note: null,
      synonyms: [],
      level: null,
    })
  }

  return {
    date: glossary.date,
    words,
    phrases,
    sentences,
    size: words.size + phrases.size + sentences.size,
  }
}

export function matchGlossary(index: GlossaryIndex | null, query: string): LookupResult | null {
  if (!index) return null
  const k = key(query)
  if (!k) return null

  const hit = index.words.get(k) ?? index.phrases.get(k) ?? index.sentences.get(k)
  if (!hit) return null
  // 표제어가 아니라 사용자가 실제로 긁은 형태를 헤더에 보여 준다
  return { ...hit, query }
}

// ─── 내려받기 + 로컬 보관 ─────────────────────────────────────────────

function readCached(): DailyGlossary | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as DailyGlossary) : null
  } catch {
    return null
  }
}

export async function loadGlossary(briefingDate?: string): Promise<GlossaryIndex | null> {
  // 같은 날짜면 받아 둔 걸 그대로 쓴다 (재방문·오프라인에서도 즉시 동작)
  const cached = readCached()
  if (cached && (!briefingDate || cached.date === briefingDate)) {
    return buildGlossaryIndex(cached)
  }

  try {
    const res = await fetch('/api/glossary')
    if (!res.ok) return cached ? buildGlossaryIndex(cached) : null
    const glossary = (await res.json()) as DailyGlossary
    if (!glossary?.date) return null
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(glossary))
    } catch {
      // 용량 초과면 메모리에만 두고 넘어간다
    }
    return buildGlossaryIndex(glossary)
  } catch {
    return cached ? buildGlossaryIndex(cached) : null
  }
}
