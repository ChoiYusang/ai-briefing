import { FAST_MODELS, generateJson } from './gemini'
import {
  DailyBriefing,
  DailyGlossary,
  GlossaryPhrase,
  GlossarySentence,
  GlossaryWord,
} from './types'

// 하루치 영어 본문에서 나온 표현을 미리 사전으로 만들어 둔다.
// 조회 때마다 Gemini를 부르지 않아도 되므로 지연이 사라지고, 비용이
// 사용자 수와 무관하게 "하루 1회 고정"이 된다.

const MAX_WORDS = 550
const WORD_BATCH = 70
const SENTENCE_BATCH = 25
const CONCURRENCY = 3

// 학습자가 굳이 찾아보지 않을 기능어·기초어. 여기 걸리면 사전에서 뺀다.
const STOPWORDS = new Set(
  `a an the and or but if of to in on at by for with from as is are was were be been being am
   it its this that these those they them their theirs he she him his her hers you your yours we us our ours
   i me my mine not no nor so than then there here what which who whom whose when where why how
   all any both each few more most other some such only own same too very can could will would shall should
   may might must do does did done have has had having about into over under again further once out up down
   off above below between through during before after while because until against among also new like
   get gets got make makes made said say says one two three first second next last year years day days
   time times lot lots want wants need needs use uses used using go goes going come comes coming
   know knows knew think thinks thought see sees seen look looks take takes taken give gives given
   even still much many well back way ways thing things people person now just yet ever never always
   really quite pretty however though although since unless whether per via upon onto within without`
    .split(/\s+/)
    .filter(Boolean)
)

function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) || [])
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.split(' ').length >= 4)
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// 배치를 몇 개씩만 동시에 돌린다 (cron 300s 안에 끝내면서 과부하는 피하려고)
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

export function collectEnglishText(briefing: DailyBriefing): string[] {
  const blocks: string[] = []
  for (const a of briefing.articles) {
    if (a.titleEn) blocks.push(a.titleEn)
    if (a.summaryEn) blocks.push(a.summaryEn)
    if (a.whyMattersEn) blocks.push(a.whyMattersEn)
  }
  return blocks
}

// 본문에 실제로 등장한 표면형과, 그 단어가 처음 나온 문장을 함께 모은다.
// 활용형("weighing")을 그대로 표제어로 쓰기 때문에 클라이언트에서 원형을
// 복원할 필요가 없다.
export function extractWords(sentences: string[]): { word: string; sentence: string }[] {
  const seen = new Map<string, string>()
  for (const sentence of sentences) {
    for (const raw of sentence.match(/[A-Za-z][A-Za-z'-]*/g) || []) {
      const word = raw.toLowerCase()
      if (word.length < 3 || STOPWORDS.has(word) || seen.has(word)) continue
      seen.set(word, sentence)
    }
  }
  return [...seen.entries()].slice(0, MAX_WORDS).map(([word, sentence]) => ({ word, sentence }))
}

export async function generateDailyGlossary(briefing: DailyBriefing): Promise<DailyGlossary> {
  const blocks = collectEnglishText(briefing)
  const sentences = blocks.flatMap(sentencesOf)
  const words = extractWords(sentences)
  const fullText = blocks.join('\n\n')

  console.log(
    `[glossary] ${briefing.date}: ${words.length} words, ${sentences.length} sentences`
  )

  // 배치 하나가 실패해도 나머지는 살린다 — 사전이 조금 비는 건 폴백으로 메워진다.
  const wordBatches = chunk(words, WORD_BATCH)
  const sentenceBatches = chunk(sentences, SENTENCE_BATCH)

  // 그룹을 순서대로 돌려 동시 호출이 CONCURRENCY를 넘지 않게 한다 (rate limit 여유)
  const wordResults = await mapLimit(wordBatches, CONCURRENCY, batch =>
    safely('words', () => runWordBatch(batch))
  )
  const sentenceResults = await mapLimit(sentenceBatches, CONCURRENCY, batch =>
    safely('sentences', () => runSentenceBatch(batch))
  )
  const phraseResult = await safely('phrases', () => runPhraseBatch(fullText))

  return {
    date: briefing.date,
    generatedAt: new Date().toISOString(),
    words: wordResults.flatMap(r => r ?? []),
    phrases: phraseResult ?? [],
    sentences: sentenceResults.flatMap(r => r ?? []),
  }
}

async function safely<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    console.log(`[glossary] ${label} batch failed — skipping. ${String(err).slice(0, 160)}`)
    return null
  }
}

async function runWordBatch(
  batch: { word: string; sentence: string }[]
): Promise<GlossaryWord[]> {
  const list = batch.map(({ word, sentence }) => `- ${word}  (문장: ${sentence})`).join('\n')

  const prompt = `너는 한국인 영어 학습자를 위한 영한 사전이야.
아래는 오늘 AI 뉴스 기사에 실제로 나온 영어 단어와, 그 단어가 등장한 문장이야.
각 단어의 사전 항목을 만들어 줘.

${list}

아래 JSON만 출력해. 마크다운, 코드펜스, 설명 문장 금지.
{ "entries": [ { "w": "...", "base": "...", "p": "...", "pos": "...", "kr": "...", "ctx": "..." } ] }

규칙:
- w: 위에 준 단어를 **그대로**(소문자) 반복한다. 철자를 바꾸거나 원형으로 고치지 않는다.
- base: 활용형이면 원형(weighing→weigh, agents→agent). 이미 원형이면 null.
- p: 그 단어의 IPA 발음기호. 사람·회사 이름이면 null.
- pos: 명사/동사/형용사/부사/전치사/접속사 중 하나. 이름이면 "고유명사".
- kr: **표제어 형태의 뜻.** 동사는 '~하다', 형용사는 '~한'. 쉼표로 최대 2개까지.
      문장에 맞춰 활용하지 않는다("경계하게 되었어요" ✕ → "경계하는, 조심하는" ○).
      사람·회사·제품 이름이면 한글 표기와 정체를 짧게(예: "앤트로픽(AI 기업)").
- ctx: 위 문장에서 쓰인 뜻을 한국어 한 줄로. 표제어 뜻과 사실상 같으면 null.
- 위에 준 단어를 **하나도 빠짐없이** 모두 포함한다. 순서도 그대로.
- 모든 한국어는 친근한 "~해요" 말투. 짧고 쉽게.`

  const parsed = await generateJson(prompt, {
    label: 'glossary:words',
    models: FAST_MODELS,
    maxRetries: 1,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    validate: p => {
      if (!Array.isArray(p?.entries) || p.entries.length === 0) throw new Error('no entries')
    },
  })

  const allowed = new Set(batch.map(b => b.word))
  return (parsed.entries as any[])
    .filter(e => typeof e?.w === 'string' && typeof e?.kr === 'string' && e.kr.trim())
    .map(e => ({
      w: String(e.w).toLowerCase().trim(),
      base: clean(e.base),
      p: clean(e.p),
      pos: clean(e.pos),
      kr: String(e.kr).trim(),
      ctx: clean(e.ctx),
    }))
    .filter(e => allowed.has(e.w))
}

async function runPhraseBatch(fullText: string): Promise<GlossaryPhrase[]> {
  const prompt = `너는 한국인 영어 학습자를 위한 영한 사전이야.
아래는 오늘 AI 뉴스 기사의 영어 본문이야.

"""
${fullText.slice(0, 9000)}
"""

이 본문에 **실제로 등장하는** 숙어, 구동사, 관용 표현, 자주 쓰는 연어(collocation)를
최대 45개 골라서 사전 항목으로 만들어 줘.

아래 JSON만 출력해. 마크다운, 코드펜스, 설명 문장 금지.
{ "entries": [ { "w": "...", "kr": "...", "note": "..." } ] }

규칙:
- w: 본문에 나온 **그대로**의 소문자 표현. 2~6단어. 본문에 없는 표현은 절대 넣지 않는다.
- kr: 표제어 형태의 뜻. 동사구는 '~하다'로.
- note: 단어를 하나씩 직역해서는 알 수 없는 뉘앙스나 쓰임 1문장. 없으면 null.
- 단어 하나짜리는 넣지 않는다. 직역해도 뻔한 조합(예: "new model")도 넣지 않는다.
- 모든 한국어는 친근한 "~해요" 말투.`

  const parsed = await generateJson(prompt, {
    label: 'glossary:phrases',
    models: FAST_MODELS,
    maxRetries: 1,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    validate: p => {
      if (!Array.isArray(p?.entries)) throw new Error('no entries')
    },
  })

  const haystack = fullText.toLowerCase()
  return (parsed.entries as any[])
    .filter(e => typeof e?.w === 'string' && typeof e?.kr === 'string' && e.kr.trim())
    .map(e => ({
      w: String(e.w).toLowerCase().trim(),
      kr: String(e.kr).trim(),
      note: clean(e.note),
    }))
    // 본문에 없는 표현을 지어내는 경우가 있어 실제 등장 여부를 확인한다
    .filter(e => e.w.split(' ').length >= 2 && haystack.includes(e.w))
}

async function runSentenceBatch(batch: string[]): Promise<GlossarySentence[]> {
  const list = batch.map((s, i) => `${i + 1}. ${s}`).join('\n')

  const prompt = `아래 영어 문장들을 한국인 독자가 읽기 좋은 자연스러운 한국어로 번역해 줘.

${list}

아래 JSON만 출력해. 마크다운, 코드펜스, 설명 문장 금지.
{ "entries": [ { "i": 1, "kr": "..." } ] }

규칙:
- i: 위 번호를 그대로. 모든 문장을 빠짐없이 번역한다.
- kr: 직역이 아니라 자연스러운 한국어 한 문장. 친근한 "~해요" 말투.
- 원문에 없는 내용을 덧붙이지 않는다.`

  const parsed = await generateJson(prompt, {
    label: 'glossary:sentences',
    models: FAST_MODELS,
    maxRetries: 1,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    validate: p => {
      if (!Array.isArray(p?.entries) || p.entries.length === 0) throw new Error('no entries')
    },
  })

  const out: GlossarySentence[] = []
  for (const e of parsed.entries as any[]) {
    const index = Number(e?.i) - 1
    if (!Number.isInteger(index) || index < 0 || index >= batch.length) continue
    if (typeof e?.kr !== 'string' || !e.kr.trim()) continue
    out.push({ en: batch[index], kr: e.kr.trim() })
  }
  return out
}

function clean(v: any): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return null
  return trimmed
}
