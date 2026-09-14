import { NextResponse } from 'next/server'
import { generateDailyGlossary } from '@/lib/generateGlossary'
import { getBriefing, getGlossary, saveGlossary } from '@/lib/storage'
import { DailyGlossary } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// 사전은 크론에서 브리핑과 함께 만들어 두는 게 정상 경로다.
// 그게 실패했거나 아직 없는 날을 위해 첫 요청 때 한 번만 만들어 자가 복구한다.
// 인스턴스당 동시 1건 + 총 3건으로 묶어 폭주를 막는다.
let inFlight: Promise<DailyGlossary | null> | null = null
let lazyRuns = 0
const LAZY_LIMIT = 3

export async function GET() {
  const briefing = await getBriefing()
  if (!briefing) {
    return NextResponse.json({ error: 'No briefing available yet' }, { status: 404 })
  }

  const existing = await getGlossary(briefing.date)
  if (existing) return NextResponse.json(existing)

  if (!inFlight) {
    if (lazyRuns >= LAZY_LIMIT) {
      return NextResponse.json({ error: 'Glossary not ready' }, { status: 404 })
    }
    lazyRuns += 1
    inFlight = buildAndSave(briefing.date)
      .catch(err => {
        console.error('[glossary] lazy build failed:', err)
        return null
      })
      .finally(() => {
        inFlight = null
      }) as Promise<DailyGlossary | null>
  }

  const built = await inFlight
  if (!built) {
    return NextResponse.json({ error: 'Glossary not ready' }, { status: 404 })
  }
  return NextResponse.json(built)

  async function buildAndSave(date: string): Promise<DailyGlossary | null> {
    const target = await getBriefing()
    if (!target || target.date !== date) return null
    console.log(`[glossary] building on demand for ${date}`)
    const glossary = await generateDailyGlossary(target)
    await saveGlossary(glossary)
    return glossary
  }
}
