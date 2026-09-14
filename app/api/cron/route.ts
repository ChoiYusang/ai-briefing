import { NextRequest, NextResponse } from 'next/server'
import { fetchRecentAINews } from '@/lib/fetchNews'
import { generateDailyBriefing } from '@/lib/generateBriefing'
import { generateDailyGlossary } from '@/lib/generateGlossary'
import { saveBriefing, saveGlossary } from '@/lib/storage'

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

    // 영어 학습용 사전은 부가 기능이다. 여기서 실패해도 브리핑은 이미 저장됐으니
    // 크론 전체를 실패로 만들지 않는다 (조회는 /api/lookup 으로 폴백된다).
    let glossaryWords = 0
    try {
      const glossary = await generateDailyGlossary(briefing)
      await saveGlossary(glossary)
      glossaryWords = glossary.words.length
      console.log(
        `[cron] Saved glossary: ${glossary.words.length} words, ${glossary.phrases.length} phrases, ${glossary.sentences.length} sentences`
      )
    } catch (err) {
      console.error('[cron] Glossary generation failed (briefing is safe):', err)
    }

    return NextResponse.json({
      success: true,
      date: briefing.date,
      articleCount: briefing.articles.length,
      glossaryWords,
    })
  } catch (error) {
    console.error('[cron] Error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
