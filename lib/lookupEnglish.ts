import { FAST_MODELS, generateJson } from './gemini'
import { detectDirection, guessKind, lookupKey, normalizeIpa, normalizeQuery } from './lookupShared'
import { LookupDirection, LookupKind, LookupResult, LookupSense } from './types'

const MAX_CONTEXT_LENGTH = 800

// 같은 표현을 여러 사람이 반복 조회하는 경우가 많아 인스턴스 메모리에 캐시해 둔다.
// (Fluid Compute라 인스턴스가 재사용되어 hit율이 꽤 높다. 콜드스타트면 그냥 비어 있을 뿐)
const CACHE_LIMIT = 800
const cache = new Map<string, LookupResult>()

function remember(key: string, result: LookupResult) {
  if (cache.size >= CACHE_LIMIT) {
    // 가장 오래된 항목부터 비운다 (Map은 삽입 순서를 유지)
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, result)
}

export async function lookupEnglish(rawText: string, rawContext = ''): Promise<LookupResult> {
  const query = normalizeQuery(rawText)
  const direction = detectDirection(query)
  const key = lookupKey(query, direction)

  const cached = cache.get(key)
  if (cached) return cached

  const context = rawContext.replace(/\s+/g, ' ').trim().slice(0, MAX_CONTEXT_LENGTH)
  const parsed = await generateJson(buildPrompt(query, context, direction), {
    label: 'lookup',
    models: FAST_MODELS,
    maxRetries: 1,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    validate: p => {
      if (typeof p?.translation !== 'string' || !p.translation.trim()) {
        throw new Error('Response has no translation')
      }
    },
  })

  const result = shape(query, direction, parsed)
  remember(key, result)
  return result
}

// 모델이 필드를 빠뜨리거나 타입을 흔들어도 UI가 깨지지 않도록 한 번 정리한다.
function shape(query: string, direction: LookupDirection, parsed: any): LookupResult {
  const kinds: LookupKind[] = ['word', 'phrase', 'sentence']
  const kind: LookupKind = kinds.includes(parsed?.kind) ? parsed.kind : guessKind(query)

  const senses: LookupSense[] = (Array.isArray(parsed?.senses) ? parsed.senses : [])
    .filter((s: any) => typeof s?.meaningKr === 'string' && s.meaningKr.trim())
    .slice(0, 4)
    .map((s: any) => ({
      pos: str(s.pos),
      meaningKr: String(s.meaningKr).trim(),
      example: str(s.example),
      exampleKr: str(s.exampleKr),
    }))

  const translation = String(parsed.translation).trim()
  const literal = str(parsed?.literal)

  return {
    query,
    kind,
    direction,
    translation,
    // 직역이 자연 번역과 사실상 같으면 중복이라 버린다
    literal: literal && literal !== translation ? literal : null,
    pronunciation: normalizeIpa(str(parsed?.pronunciation)),
    senses: senses.length ? senses : [{ pos: null, meaningKr: translation }],
    note: str(parsed?.note),
    synonyms: (Array.isArray(parsed?.synonyms) ? parsed.synonyms : [])
      .filter((s: any) => typeof s === 'string' && s.trim())
      .slice(0, 4),
    level: str(parsed?.level),
  }
}

function str(v: any): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return null
  return trimmed
}

function buildPrompt(query: string, context: string, direction: LookupDirection): string {
  const contextBlock = context
    ? `\n[이 표현이 들어있던 문단 — 뜻을 고를 때 반드시 참고]\n"""\n${context}\n"""\n`
    : ''

  if (direction === 'ko-en') {
    return `너는 한국인 영어 학습자를 위한 한영 사전이야.
학습자가 AI 뉴스 브리핑을 읽다가 아래 한국어 표현을 드래그해서 "이건 영어로 뭐라고 해?"라고 물었어.

[선택한 표현]
"""
${query}
"""
${contextBlock}
아래 JSON만 출력해. 마크다운, 코드펜스, 설명 문장 금지.
{
  "kind": "word" | "phrase" | "sentence",
  "translation": "이 문맥에서 가장 자연스러운 영어 표현",
  "literal": null,
  "pronunciation": "translation의 IPA 발음기호. 문장이면 null",
  "senses": [{ "pos": "품사 또는 null", "meaningKr": "이 영어 표현을 언제 쓰는지 한국어 설명", "example": "영어 예문", "exampleKr": "예문 번역" }],
  "note": "비슷한 영어 표현과의 차이나 쓸 때 주의할 점 1~2문장. 없으면 null",
  "synonyms": ["바꿔 쓸 수 있는 영어 표현 최대 4개"],
  "level": "기초" | "수능" | "토익" | "고급" | "전문용어"
}

규칙:
- translation: 단어·구면 표제어 형태(동사는 원형)로 쓰고, 선택한 표현에 없는 주어·목적어를 끌어오지 않는다.
  문장이면 자연스러운 영어 한 문장으로 옮긴다.
- senses는 1~3개. 실제 원어민이 쓰는 표현 위주로.
- 모든 한국어 설명은 친근한 "~해요" 말투로.`
  }

  return `너는 한국인 영어 학습자를 위한 영한 사전이자 번역가야.
학습자가 영어 AI 뉴스 기사를 읽다가 아래 텍스트를 드래그해서 뜻을 물었어.

[선택한 텍스트]
"""
${query}
"""
${contextBlock}
아래 JSON만 출력해. 마크다운, 코드펜스, 설명 문장 금지.
{
  "kind": "word" | "phrase" | "sentence",
  "translation": "이 문맥에서의 가장 자연스러운 한국어 번역",
  "literal": "직역. 자연스러운 번역과 뚜렷이 다를 때만, 아니면 null",
  "pronunciation": "IPA 발음기호. 단어나 짧은 구에만, 문장이면 null",
  "senses": [{ "pos": "품사 또는 null", "meaningKr": "뜻 설명", "example": "쉬운 영어 예문", "exampleKr": "예문 번역" }],
  "note": "학습자가 헷갈릴 만한 포인트 1~2문장. 없으면 null",
  "synonyms": ["비슷한 영어 표현 최대 4개"],
  "level": "기초" | "수능" | "토익" | "고급" | "전문용어"
}

규칙:
- kind: 한 단어면 word / 2~6단어 덩어리·숙어·구동사면 phrase / 완결된 문장이면 sentence
- translation: ★가장 중요★ 사전 뜻을 죽 나열하지 말고, 위 문맥에서 실제로 쓰인 뜻 하나를 고른다.
  - word / phrase: **표제어 형태**로 쓴다. 동사는 '~하다', 형용사는 '~한', 명사는 명사로.
    문장에 맞춰 활용하지 말고("경계하게 되었어요" ✕ → "경계하는, 조심하는" ○),
    선택한 텍스트에 없는 주어·목적어를 끌어오지 않는다("지출을 늘리다" ✕ → "규모를 점진적으로 늘리다" ○).
  - sentence: 문장 전체를 자연스러운 한국어 한 문장으로 완역한다.
- literal: word에는 거의 필요 없다(대부분 null). phrase·sentence에서 직역이 뜻과 어긋날 때만 채운다.
- senses 작성법
  - word: 1번에 '이 문맥에서 쓰인 뜻'을 두고, 자주 쓰이는 다른 뜻을 1~2개 더. 최대 3개.
  - phrase: 숙어·구동사의 의미 1~2개. 단어를 하나씩 직역해서는 알 수 없는 뉘앙스를 꼭 설명.
  - sentence: 문장을 의미 덩어리로 2~4개 끊어서 각 덩어리가 무슨 뜻인지. pos는 null, example/exampleKr도 null.
- note: 뉘앙스, 문법 구조(수동태·분사구문·가정법 등), 비슷한 단어와의 차이 중 실제로 도움 되는 것만.
- 모든 한국어 설명은 친근한 "~해요" 말투로. 전문 용어로 설명하지 말고 쉽게.`
}
