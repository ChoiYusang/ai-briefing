import { NextResponse } from 'next/server'
import { getBriefing } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET() {
  const briefing = await getBriefing()
  if (!briefing) {
    return NextResponse.json({ error: 'No briefing available yet' }, { status: 404 })
  }
  return NextResponse.json(briefing)
}
