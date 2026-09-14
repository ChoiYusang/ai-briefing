'use client'

import { lookupKey } from './lookupShared'
import { LookupResult, WordbookEntry } from './types'

const WORDBOOK_KEY = 'study.wordbook.v1'
const CACHE_KEY = 'study.lookupCache.v1'
const WORDBOOK_LIMIT = 500
const CACHE_LIMIT = 300

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 용량 초과 등은 조용히 넘어간다 — 저장은 부가 기능이라 흐름을 막지 않는다
  }
}

// ─── 단어장 ───────────────────────────────────────────────────────────

export function loadWordbook(): WordbookEntry[] {
  const list = read<WordbookEntry[]>(WORDBOOK_KEY, [])
  return Array.isArray(list) ? list : []
}

export function saveToWordbook(result: LookupResult): WordbookEntry[] {
  const first = result.senses[0]
  const entry: WordbookEntry = {
    id: lookupKey(result.query, result.direction),
    query: result.query,
    kind: result.kind,
    direction: result.direction,
    translation: result.translation,
    pronunciation: result.pronunciation ?? null,
    meaningKr: first?.meaningKr ?? result.translation,
    example: first?.example ?? null,
    exampleKr: first?.exampleKr ?? null,
    savedAt: new Date().toISOString(),
  }
  const next = [entry, ...loadWordbook().filter(e => e.id !== entry.id)].slice(0, WORDBOOK_LIMIT)
  write(WORDBOOK_KEY, next)
  return next
}

export function removeFromWordbook(id: string): WordbookEntry[] {
  const next = loadWordbook().filter(e => e.id !== id)
  write(WORDBOOK_KEY, next)
  return next
}

export function clearWordbook(): WordbookEntry[] {
  write(WORDBOOK_KEY, [])
  return []
}

// ─── 조회 결과 캐시 ───────────────────────────────────────────────────
// 같은 단어를 다시 긁었을 때 네트워크 없이 즉시 뜨게 한다.

type CacheMap = Record<string, LookupResult>

export function readCachedLookup(query: string, direction: string): LookupResult | null {
  const map = read<CacheMap>(CACHE_KEY, {})
  return map[lookupKey(query, direction)] ?? null
}

export function writeCachedLookup(result: LookupResult) {
  const map = read<CacheMap>(CACHE_KEY, {})
  const key = lookupKey(result.query, result.direction)
  delete map[key] // 최근 항목이 뒤로 가도록 다시 넣는다
  map[key] = result

  const keys = Object.keys(map)
  if (keys.length > CACHE_LIMIT) {
    for (const old of keys.slice(0, keys.length - CACHE_LIMIT)) delete map[old]
  }
  write(CACHE_KEY, map)
}
