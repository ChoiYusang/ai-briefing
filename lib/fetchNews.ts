import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded'],
    ],
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AI-Briefing/1.0)',
  },
  timeout: 10000,
})

// content:encoded 또는 content HTML에서 첫 번째 이미지 URL 추출
function extractImageFromHtml(html: string): string | undefined {
  if (!html) return undefined
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (!match) return undefined
  const url = match[1]
  // data URI나 tracking pixel 제외
  if (url.startsWith('data:') || url.includes('pixel') || url.length < 20) return undefined
  return url
}

const RSS_FEEDS = [
  // ── 메이저 테크 미디어 ──────────────────────────────────────────
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
  'https://www.wired.com/feed/tag/artificial-intelligence/rss',
  'https://thenextweb.com/feed/',
  'https://venturebeat.com/category/ai/feed/',

  // ── AI 전문 미디어 ───────────────────────────────────────────────
  'https://www.artificialintelligence-news.com/feed/',
  'https://aimagazine.com/rss.xml',

  // ── 주요 AI 기업 공식 블로그 ─────────────────────────────────────
  'https://openai.com/news/rss.xml',
  'https://www.anthropic.com/news/rss',
  'https://blog.google/technology/ai/rss/',

  // ── 학술·연구 중심 ───────────────────────────────────────────────
  'https://news.mit.edu/topic/artificial-intelligence2/rss',

  // ── 추가 AI 전문 미디어 ───────────────────────────────────────────
  'https://www.technologyreview.com/feed/',
  'https://www.zdnet.com/topic/artificial-intelligence/rss.xml',
]
// ※ Google News RSS는 이미지 없음 + 리다이렉션 오류로 제외

export interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
  imageUrl?: string
  source?: string
}

export async function fetchRecentAINews(): Promise<RssItem[]> {
  const allItems: RssItem[] = []
  const seen = new Set<string>()
  const cutoff = new Date(Date.now() - 28 * 60 * 60 * 1000) // 28h 버퍼

  const results = await Promise.allSettled(
    RSS_FEEDS.map(feedUrl => parser.parseURL(feedUrl))
  )

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[fetchNews] Failed: ${RSS_FEEDS[i]} — ${result.reason}`)
      return
    }

    const feed = result.value
    const sourceName = feed.title || RSS_FEEDS[i]

    for (const item of feed.items) {
      const pubDate = new Date(item.pubDate || Date.now())
      if (pubDate < cutoff) continue

      const title = (item.title || '').trim()
      if (!title || seen.has(title.toLowerCase())) continue
      seen.add(title.toLowerCase())

      const mediaContent = (item as any).mediaContent
      const imageUrl =
        (Array.isArray(mediaContent) ? mediaContent[0]?.$?.url : mediaContent?.$?.url) ||
        (item as any).mediaThumbnail?.$?.url ||
        (item as any).enclosure?.url ||
        extractImageFromHtml((item as any).contentEncoded || '') ||
        extractImageFromHtml((item as any).content || '') ||
        undefined

      const link = item.link || ''

      // pubDate가 없는 기사는 실제 발행일을 알 수 없으므로 제외
      if (!item.pubDate) continue

      allItems.push({
        title,
        link,
        pubDate: item.pubDate,
        description: item.contentSnippet || item.summary || '',
        imageUrl,
        source: sourceName,
      })
    }
  })

  // 최신순 정렬 후 상위 40개 → Gemini에 전달
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  console.log(`[fetchNews] Collected ${allItems.length} unique items from ${RSS_FEEDS.length} feeds`)
  return allItems.slice(0, 40)
}
