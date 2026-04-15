import Parser from 'rss-parser'

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
    ],
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AI-Briefing/1.0)',
  },
})

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=artificial+intelligence+AI+LLM&hl=en-US&gl=US&ceid=US:en',
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://feeds.feedburner.com/venturebeat/SZYF',
]

export interface RssItem {
  title: string
  link: string
  pubDate: string
  description: string
  imageUrl?: string
}

export async function fetchRecentAINews(): Promise<RssItem[]> {
  const allItems: RssItem[] = []
  const seen = new Set<string>()
  const cutoff = new Date(Date.now() - 28 * 60 * 60 * 1000) // 28h buffer

  for (const feedUrl of RSS_FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl)
      for (const item of feed.items) {
        const pubDate = new Date(item.pubDate || Date.now())
        if (pubDate < cutoff) continue
        if (!item.title || seen.has(item.title)) continue
        seen.add(item.title)

        const imageUrl =
          (item as any).mediaContent?.$?.url ||
          (item as any).mediaThumbnail?.$?.url ||
          (item as any).enclosure?.url ||
          undefined

        allItems.push({
          title: item.title,
          link: item.link || '',
          pubDate: item.pubDate || new Date().toISOString(),
          description: item.contentSnippet || item.summary || '',
          imageUrl,
        })
      }
    } catch (err) {
      console.error(`[fetchNews] Failed to fetch ${feedUrl}:`, err)
    }
  }

  // Sort newest first, cap at 25 for Claude
  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
  return allItems.slice(0, 25)
}
