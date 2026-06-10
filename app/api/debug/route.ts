import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentAINews } from '@/lib/fetchNews'
import { generateDailyBriefing } from '@/lib/generateBriefing'

// 임시 진단용 엔드포인트 — 원인 파악 후 삭제 예정
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  // 가벼운 가드: 아무나/봇이 Gemini를 호출하지 못하도록
  if (request.nextUrl.searchParams.get('key') !== 'diag-2026') {
    return new NextResponse('forbidden', { status: 403 })
  }

  const report: Record<string, unknown> = {
    env: {
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
  }

  // 1단계: 뉴스 수집
  try {
    const news = await fetchRecentAINews()
    report.fetchNews = { ok: true, count: news.length, firstTitle: news[0]?.title }

    // 2단계: Gemini 요약 생성
    try {
      const briefing = await generateDailyBriefing(news)
      report.generateBriefing = {
        ok: true,
        date: briefing.date,
        articleCount: briefing.articles.length,
      }
    } catch (err) {
      report.generateBriefing = {
        ok: false,
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }
    }
  } catch (err) {
    report.fetchNews = { ok: false, error: String(err) }
  }

  return NextResponse.json(report, { status: 200 })
}
