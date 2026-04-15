import Anthropic from '@anthropic-ai/sdk'
import { RssItem } from './fetchNews'
import { Article, DailyBriefing } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateDailyBriefing(items: RssItem[]): Promise<DailyBriefing> {
  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}]\nTitle: ${item.title}\nURL: ${item.link}\nDate: ${item.pubDate}\nDescription: ${item.description}`
    )
    .join('\n\n')

  const prompt = `You are an AI news curator delivering a premium daily briefing for a Korean non-technical reader.

Given these recent AI news articles, select up to 5 most significant stories and produce a structured briefing in JSON.

SELECTION CRITERIA (priority order):
1. Major model releases or significant capability breakthroughs
2. Big company announcements (OpenAI, Google, Meta, Anthropic, Microsoft, xAI, etc.)
3. Regulatory, legal, or policy developments affecting AI
4. Real-world AI impact stories — jobs, economy, society
5. Significant research with near-term practical implications

EXCLUDE: minor product updates, rumors without substance, duplicate coverage, opinion-only pieces.

For each selected article produce these fields:
- titleKr: exact Korean translation of the original article title
- titleEn: original English title (or translate to English if source is Korean)
- summaryKr: exactly 10 flowing sentences in Korean. Written for a smart non-technical reader. Include context, background, and what happened. Narrative prose, NO bullet points.
- summaryEn: exactly 10 flowing sentences in English. Same depth. Narrative prose, NO bullet points.
- terms: array of 2-4 technical or AI-specific terms that appear in the article. Each with Korean and English explanations in 1-2 plain-language sentences.
- whyMattersKr: 3-4 sentences in Korean. Focus on real-world impact on daily life, jobs, economy, or society.
- whyMattersEn: 3-4 sentences in English. Same focus.
- source: name of the publication (e.g. "TechCrunch", "The Verge")
- sourceUrl: the article URL

Return ONLY valid JSON — no markdown, no explanation, no code fences. Exactly this shape:
{
  "articles": [
    {
      "titleKr": "...",
      "titleEn": "...",
      "summaryKr": "...",
      "summaryEn": "...",
      "terms": [
        { "termKr": "...", "termEn": "...", "explanationKr": "...", "explanationEn": "..." }
      ],
      "whyMattersKr": "...",
      "whyMattersEn": "...",
      "source": "...",
      "sourceUrl": "..."
    }
  ]
}

Today's articles:
${itemsText}`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 10000,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected Claude response type')

  const raw = content.text.trim()
  const parsed = JSON.parse(raw)

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  const articles: Article[] = parsed.articles.map((a: Omit<Article, 'id' | 'colorIndex'>, i: number) => ({
    ...a,
    id: `${dateStr}-${i}`,
    colorIndex: i,
    publishedAt: items.find(item => item.link === a.sourceUrl)?.pubDate || today.toISOString(),
  }))

  return {
    date: dateStr,
    generatedAt: today.toISOString(),
    articles,
  }
}
