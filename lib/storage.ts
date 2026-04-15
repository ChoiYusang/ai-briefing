import { put, list, download } from '@vercel/blob'
import { DailyBriefing } from './types'

const PREFIX = 'briefings/'

export async function saveBriefing(briefing: DailyBriefing): Promise<void> {
  await put(`${PREFIX}${briefing.date}.json`, JSON.stringify(briefing), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function getBriefing(): Promise<DailyBriefing | null> {
  try {
    const { blobs } = await list({ prefix: PREFIX })
    if (blobs.length === 0) return null

    blobs.sort((a, b) => b.pathname.localeCompare(a.pathname))
    const latest = blobs[0]

    const res = await download(latest.url)
    return res.json()
  } catch (err) {
    console.error('[storage] getBriefing error:', err)
    return null
  }
}
