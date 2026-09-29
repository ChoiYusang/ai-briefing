import { NextResponse } from 'next/server'
import { GLOSSARY_BUILDER, generateDailyGlossary } from '@/lib/generateGlossary'
import {
  getBriefing,
  getGlossary,
  getGlossaryAttempts,
  saveGlossary,
  setGlossaryAttempts,
} from '@/lib/storage'
import { DailyGlossary } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// 사전은 크론에서 브리핑과 함께 만들어 두는 게 정상 경로다.
// 그게 실패했거나 아직 없는 날을 위해 첫 요청 때 한 번만 만들어 자가 복구한다.
// 인스턴스당 동시 1건 + 날짜별 전체 2건(블롭 카운터)으로 묶어 폭주를 막는다.
// 두 번 다 실패한 날은 드래그 조회가 /api/lookup 으로 폴백된다.
let inFlight: Promise<DailyGlossary | null> | null = null
const DAILY_LAZY_LIMIT = 2

export async function GET() {
  const briefing = await getBriefing()
  if (!briefing) {
    return NextResponse.json({ error: 'No briefing available yet' }, { status: 404 })
  }

  const existing = await getGlossary(briefing.date)
  if (existing && existing.builder === GLOSSARY_BUILDER) return NextResponse.json(existing)

  if (!inFlight) {
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
    const attempts = await getGlossaryAttempts(date)
    if (attempts >= DAILY_LAZY_LIMIT) return null
    // 빌드 전에 먼저 기록한다 — 빌드가 300s 타임아웃으로 끊겨도 횟수는 남도록
    await setGlossaryAttempts(date, attempts + 1)

    const target = await getBriefing()
    if (!target || target.date !== date) return null
    console.log(`[glossary] building on demand for ${date}`)
    const glossary = await generateDailyGlossary(target)
    await saveGlossary(glossary)
    return glossary
  }
}
