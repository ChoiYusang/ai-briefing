import { NextRequest, NextResponse } from 'next/server'
import { lookupEnglish } from '@/lib/lookupEnglish'
import { MAX_QUERY_LENGTH, isLookupWorthy, normalizeQuery } from '@/lib/lookupShared'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// 공개 서비스라 Gemini 쿼터를 지키기 위한 가벼운 IP 레이트리밋.
// (인스턴스 메모리 기준이라 엄밀하지는 않지만 폭주는 막아준다)
const WINDOW_MS = 5 * 60 * 1000
const MAX_PER_WINDOW = 80
const hits = new Map<string, { count: number; resetAt: number }>()

function tooManyRequests(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key)
    }
    return false
  }
  entry.count += 1
  return entry.count > MAX_PER_WINDOW
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (tooManyRequests(ip)) {
    return NextResponse.json(
      { error: '잠시 후 다시 시도해 주세요. 너무 많이 찾아봤어요 🙂' },
      { status: 429 }
    )
  }

  let text = ''
  let context = ''
  try {
    const body = await request.json()
    text = typeof body?.text === 'string' ? body.text : ''
    context = typeof body?.context === 'string' ? body.context : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const query = normalizeQuery(text)
  if (!isLookupWorthy(query)) {
    return NextResponse.json({ error: '찾을 단어나 문장을 선택해 주세요' }, { status: 400 })
  }
  if (text.trim().length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `한 번에 ${MAX_QUERY_LENGTH}자까지만 찾아볼 수 있어요` },
      { status: 400 }
    )
  }

  try {
    const result = await lookupEnglish(query, context)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[lookup] Error:', error)
    return NextResponse.json(
      { error: '사전을 불러오지 못했어요. 잠시 후 다시 시도해 주세요' },
      { status: 502 }
    )
  }
}
