import { GoogleGenerativeAI } from '@google/generative-ai'
import { RssItem } from './fetchNews'
import { Article, DailyBriefing } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 최신 모델부터 순서대로 시도 (404 시 다음 모델로 자동 전환)
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

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
- titleEn: original English title
- summaryKr: exactly 10 flowing sentences in Korean. Written for a smart non-technical reader. Include context, background, and what happened. Narrative prose, NO bullet points.
- summaryEn: exactly 10 flowing sentences in English. Same depth. Narrative prose, NO bullet points.
- terms: array of 2-4 technical or AI-specific terms. Each with Korean and English explanations in 1-2 plain-language sentences.
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

  let lastError: unknown
  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[generateBriefing] Trying model: ${modelName}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const raw = result.response.text().trim()

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')

      const parsed = JSON.parse(jsonMatch[0])
      const today = new Date()
      const dateStr = today.toISOString().split('T')[0]

      const articles: Article[] = parsed.articles.map(
        (a: Omit<Article, 'id' | 'colorIndex'>, i: number) => ({
          ...a,
          id: `${dateStr}-${i}`,
          colorIndex: i,
          publishedAt: items.find(item => item.link === a.sourceUrl)?.pubDate || today.toISOString(),
        })
      )

      console.log(`[generateBriefing] Success with model: ${modelName}`)
      return { date: dateStr, generatedAt: today.toISOString(), articles }
    } catch (err) {
      const msg = String(err)
      if (msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
        console.log(`[generateBriefing] Model ${modelName} unavailable, trying next...`)
        lastError = err
        continue
      }
      throw err // 404가 아닌 에러는 바로 던짐
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`)
}
