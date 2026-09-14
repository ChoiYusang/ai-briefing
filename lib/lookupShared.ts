import { LookupDirection, LookupKind } from './types'

export const MAX_QUERY_LENGTH = 400

// 서버(사전 API)와 클라이언트(드래그 감지)가 같은 규칙을 쓰도록 여기 모아 둔다.
// 이 파일은 서버 전용 의존성을 import하지 않는다 — 클라이언트 번들에 들어간다.

export function detectDirection(text: string): LookupDirection {
  const hangul = (text.match(/[\uAC00-\uD7A3]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  return hangul > latin ? 'ko-en' : 'en-ko'
}

export function normalizeQuery(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH)
}

export function guessKind(query: string): LookupKind {
  const words = query.split(/\s+/).filter(Boolean).length
  if (words <= 1) return 'word'
  if (words <= 6 && !/[.!?]/.test(query)) return 'phrase'
  return 'sentence'
}

export function lookupKey(query: string, direction: string): string {
  return `${direction}:${query.toLowerCase().replace(/\s+/g, ' ').trim()}`
}

// 조회할 가치가 있는 선택인지 (빈 선택·기호만·너무 긴 덩어리 걸러내기)
export function isLookupWorthy(query: string): boolean {
  if (!query || query.length > MAX_QUERY_LENGTH) return false
  return /[\p{L}]/u.test(query)
}

// 모델마다 발음기호를 "/ˈweəri/", "ˈweəri", "[weəri]" 등 제각각으로 준다.
// 표시 형식을 하나로 맞춘다 (Flash-Lite는 슬래시를 자주 빠뜨린다).
export function normalizeIpa(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const core = value.trim().replace(/^[\/\[\]]+|[\/\[\]]+$/g, '').trim()
  if (!core || core.toLowerCase() === 'null') return null
  return `/${core}/`
}
