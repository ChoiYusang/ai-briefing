import { put, list } from '@vercel/blob'
import { DailyBriefing, DailyGlossary } from './types'

const PREFIX = 'briefings/'
const GLOSSARY_PREFIX = 'glossaries/'

export async function saveBriefing(briefing: DailyBriefing): Promise<void> {
  await put(`${PREFIX}${briefing.date}.json`, JSON.stringify(briefing), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
}

export async function getBriefing(): Promise<DailyBriefing | null> {
  try {
    const { blobs } = await list({ prefix: PREFIX })
    if (blobs.length === 0) return null

    blobs.sort((a, b) => b.pathname.localeCompare(a.pathname))
    const res = await fetch(blobs[0].url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error('[storage] getBriefing error:', err)
    return null
  }
}

// ─── 미리 만들어 둔 사전 ──────────────────────────────────────────────

export async function saveGlossary(glossary: DailyGlossary): Promise<void> {
  await put(`${GLOSSARY_PREFIX}${glossary.date}.json`, JSON.stringify(glossary), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  })
}

export async function getGlossary(date: string): Promise<DailyGlossary | null> {
  try {
    const { blobs } = await list({ prefix: `${GLOSSARY_PREFIX}${date}` })
    const match = blobs.find(b => b.pathname === `${GLOSSARY_PREFIX}${date}.json`)
    if (!match) return null

    const res = await fetch(match.url, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error('[storage] getGlossary error:', err)
    return null
  }
}

// ─── 사전 자가 복구 횟수 ──────────────────────────────────────────────
// 인스턴스 메모리 카운터만으로는 인스턴스가 여러 개 뜨거나 재시작되면 초기화돼서,
// 크론 사전 생성이 실패한 날 방문자마다 사전을 통째로 다시 만드는 일이 생겼다.
// 날짜별 시도 횟수를 블롭에 남겨 전체 인스턴스 합산으로 제한한다.

function glossaryAttemptsPath(date: string) {
  return `${GLOSSARY_PREFIX}${date}.attempts.json`
}

export async function getGlossaryAttempts(date: string): Promise<number> {
  try {
    const path = glossaryAttemptsPath(date)
    const { blobs } = await list({ prefix: path })
    const match = blobs.find(b => b.pathname === path)
    if (!match) return 0
    const res = await fetch(match.url, { cache: 'no-store' })
    if (!res.ok) return 0
    const data = await res.json()
    return typeof data?.count === 'number' ? data.count : 0
  } catch (err) {
    console.error('[storage] getGlossaryAttempts error:', err)
    // 못 읽으면 한도에 걸린 것으로 본다 — 비용 쪽으로 안전하게
    return Number.POSITIVE_INFINITY
  }
}

export async function setGlossaryAttempts(date: string, count: number): Promise<void> {
  await put(glossaryAttemptsPath(date), JSON.stringify({ count, at: new Date().toISOString() }), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  })
}
