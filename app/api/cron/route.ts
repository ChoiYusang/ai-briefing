import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentAINews } from '@/lib/fetchNews'
import { generateDailyBriefing } from '@/lib/generateBriefing'
import { saveBriefing } from '@/lib/storage'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    console.log('[cron] Fetching AI news...')
    const news = await fetchRecentAINews()

    if (news.length === 0) {
      return NextResponse.json({ success: false, message: 'No news items found' }, { status: 200 })
    }

    console.log(`[cron] Got ${news.length} items. Generating briefing...`)
    const briefing = await generateDailyBriefing(news)

    await saveBriefing(briefing)
    console.log(`[cron] Saved briefing for ${briefing.date} (${briefing.articles.length} articles)`)

    return NextResponse.json({
      success: true,
      date: briefing.date,
      articleCount: briefing.articles.length,
    })
  } catch (error) {
    console.error('[cron] Error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
