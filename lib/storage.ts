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
