import { put, list } from '@vercel/blob'
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

    // private blob은 list()가 반환하는 downloadUrl(서명된 URL) 사용
    const fetchUrl = (latest as any).downloadUrl || latest.url
    const res = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch (err) {
    console.error('[storage] getBriefing error:', err)
    return null
  }
}
