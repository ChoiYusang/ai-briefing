import { put, list } from '@vercel/blob'
import { DailyBriefing } from './types'

const PREFIX = 'briefings/'

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
