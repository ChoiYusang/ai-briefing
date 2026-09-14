import { RssItem } from './fetchNews'
import { generateJson } from './gemini'
import { Article, DailyBriefing } from './types'

export async function generateDailyBriefing(items: RssItem[]): Promise<DailyBriefing> {
  const itemsText = items
    .map(
      (item, i) =>
        `[${i + 1}]\nTitle: ${item.title}\nURL: ${item.link}\nDate: ${item.pubDate}\nDescription: ${item.description}${item.imageUrl ? `\nImage: ${item.imageUrl}` : ''}`
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

WRITING STYLE — CRITICAL:
Write like a smart, well-informed friend casually explaining the news over coffee.
- Korean: 편안하고 자연스러운 구어체. 문장 끝은 "~해요", "~거예요", "~됩니다" 혼용. 딱딱한 뉴스 문체 금지.
- English: Conversational but sharp. Like a knowledgeable friend, not a news anchor.
- 어렵고 복잡한 내용도 "쉽게 말하면", "한마디로", "핵심은" 같은 표현으로 자연스럽게 연결해요.
- 독자가 AI를 전혀 모르는 지인이라고 생각하고, 흥미롭게 설명해 주세요.

ENGLISH-LEARNER NOTE:
Korean readers also read the English version to study English. Keep summaryEn / whyMattersEn in
clear, natural, idiomatic English with complete sentences — no fragments, no headline-speak.
Do not dumb the English down; just keep it clean and well-formed.

For each selected article produce these fields:
- titleKr: exact Korean translation of the original article title
- titleEn: original English title
- imageUrl: if the article's image URL is available in the input data, include it here. Otherwise return null.
- summaryKr: 10문장 내외. 비전공자 친구에게 카카오톡으로 설명하듯 자연스럽고 친근한 말투로. 배경과 맥락을 충분히 담되, 읽는 재미가 있어야 해요. 줄글 형식, 불릿 금지.
- summaryEn: Around 10 sentences. Conversational tone, like texting a smart friend. Include context and background. Flowing prose, no bullets.
- terms: array of 4 to 6 technical or AI-specific terms or concepts that appear in or are relevant to this article. These should be terms a non-technical Korean reader would NOT know. For each term provide:
  - termKr: the term in Korean (or transliterated)
  - termEn: the term in English
  - explanationKr: 2문장. 일상적인 비유를 활용해서 친근하게. 전문 용어 금지.
  - explanationEn: 2 sentences. Use everyday analogies. No jargon.
- whyMattersKr: 3~4문장. 내 일상, 직업, 경제에 구체적으로 어떤 영향을 주는지. 친근한 말투로.
- whyMattersEn: 3-4 sentences. Same focus, conversational tone.
- source: name of the publication
- sourceUrl: the article URL

Return ONLY valid JSON — no markdown, no explanation, no code fences:
{
  "articles": [
    {
      "titleKr": "...",
      "titleEn": "...",
      "imageUrl": "..." or null,
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

  const parsed = await generateJson(prompt, {
    label: 'generateBriefing',
    validate: p => {
      if (!Array.isArray(p?.articles) || p.articles.length === 0) {
        throw new Error('Response has no articles')
      }
    },
  })

  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]

  const articles: Article[] = parsed.articles.map(
    (a: Omit<Article, 'id' | 'colorIndex'>, i: number) => ({
      ...a,
      imageUrl: a.imageUrl || items.find(item => item.link === a.sourceUrl)?.imageUrl || null,
      id: `${dateStr}-${i}`,
      colorIndex: i,
      publishedAt: items.find(item => item.link === a.sourceUrl)?.pubDate || today.toISOString(),
    })
  )

  return { date: dateStr, generatedAt: today.toISOString(), articles }
}
