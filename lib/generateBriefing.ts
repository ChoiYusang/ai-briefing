import { GoogleGenerativeAI } from '@google/generative-ai'
import { RssItem } from './fetchNews'
import { Article, DailyBriefing } from './types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

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

  let lastError: unknown
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const parsed = await generateWithRetry(modelName, prompt)
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

      console.log(`[generateBriefing] Success with model: ${modelName}`)
      return { date: dateStr, generatedAt: today.toISOString(), articles }
    } catch (err) {
      // 재시도까지 한 뒤에도 이 모델이 실패하면 다음 후보 모델로 넘어간다.
      console.log(
        `[generateBriefing] Model ${modelName} failed after retries — trying next. ${String(err).slice(0, 200)}`
      )
      lastError = err
      continue
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`)
}

// 일시적(503 과부하 / 429 / 5xx / 네트워크 / 일회성 JSON 파싱) 실패는
// 지수 backoff로 재시도한다. 모델 부재(404)·인증 오류는 재시도해도 의미가 없어 즉시 포기.
// 반환 타입은 원본(JSON.parse → any)과 동일하게 느슨히 둔다.
// (parsed.articles 매핑의 imageUrl null 허용 등 기존 동작을 그대로 보존)
async function generateWithRetry(
  modelName: string,
  prompt: string,
  maxRetries = 3
): Promise<any> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[generateBriefing] ${modelName} attempt ${attempt + 1}/${maxRetries + 1}`)
      const model = genAI.getGenerativeModel({ model: modelName })
      const result = await model.generateContent(prompt)
      const raw = result.response.text().trim()

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')

      return JSON.parse(jsonMatch[0])
    } catch (err) {
      const msg = String(err)
      // 재시도해도 소용없는 오류는 즉시 throw (상위 루프가 다음 모델로 넘어감)
      const nonRetryable =
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('no longer available') ||
        msg.includes('API key') ||
        msg.includes('API_KEY') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('401') ||
        msg.includes('403')
      if (nonRetryable || attempt === maxRetries) throw err

      lastError = err
      const delayMs = Math.min(2000 * 2 ** attempt, 20000) // 2s, 4s, 8s … (최대 20s)
      console.log(
        `[generateBriefing] ${modelName} transient error, retrying in ${delayMs}ms — ${msg.slice(0, 150)}`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}
