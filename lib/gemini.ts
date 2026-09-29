import { GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 여기 적는 모델은 반드시 '현재 서비스 중'이어야 한다.
// 은퇴한 모델을 적어 두면 폴백이 있는 척만 하고 실제로는 전부 404로 떨어진다.
// (2.0 Flash 계열은 셧다운, 1.5 계열은 활성 목록에서 빠졌다 — 2026-09 확인)

// 브리핑 생성처럼 품질이 중요한 작업용 (앞에서부터 순서대로 시도).
// 하루 1콜이라 비용은 사실상 무의미하니 품질과 안정성만 본다.
export const QUALITY_MODELS = [
  'gemini-2.5-flash', // 지금 프롬프트가 맞춰져 있는 기준 모델
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-2.5-pro',
]

// 사전 조회·사전 생성용. 정형 JSON을 뱉는 단순 작업이라 Lite로 충분하다.
// (2.5 Flash-Lite는 "no longer available to new users"로 404 — 9/14 이후 실제로 쓰인 건 3.1 Flash-Lite였다)
// 3.1 Flash-Lite는 측정상 thinking 토큰이 0이지만(2026-09-29), 폴백 모델까지 사고 비용이
// 새지 않게 호출하는 쪽에서 thinking: 'minimal'을 준다.
export const FAST_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
]

// thinking 토큰은 출력 요금으로 청구된다. 'minimal'이면 모델이 허용하는 최저치로 줄인다.
// 3.x는 thinkingLevel, 2.5는 thinkingBudget로 받는다 (섞어 보내면 400).
export type ThinkingLevel = 'minimal' | 'low'

function thinkingConfigFor(modelName: string, level: ThinkingLevel) {
  if (modelName.startsWith('gemini-2.5')) {
    // 2.5 Pro는 0을 못 받는다 (최소 128)
    const floor = modelName.includes('pro') ? 128 : 0
    return { thinkingBudget: level === 'minimal' ? floor : Math.max(floor, 1024) }
  }
  return { thinkingLevel: level }
}

// 선불 크레딧 소진·월 지출 한도 초과. 모든 모델이 같은 결제 계정을 쓰므로
// 다른 모델로 넘어가거나 재시도해 봐야 요청만 늘어난다 → 즉시 중단.
function isBillingError(msg: string): boolean {
  return (
    msg.includes('402') ||
    msg.includes('Payment Required') ||
    msg.includes('prepayment credits') ||
    /spend(ing)? (cap|limit)/i.test(msg)
  )
}

export interface TokenUsage {
  input: number
  output: number
  thoughts: number
}

// 호출별 토큰을 로그로 남겨서, 비용이 튀면 어느 작업이 먹는지 바로 보이게 한다.
// usageListener는 비교 스크립트처럼 합계가 필요한 곳에서만 붙인다.
export let usageListener: ((label: string, model: string, usage: TokenUsage) => void) | null = null
export function setUsageListener(fn: typeof usageListener) {
  usageListener = fn
}

export interface GenerateJsonOptions {
  label: string
  models?: string[]
  maxRetries?: number
  generationConfig?: GenerationConfig
  thinking?: ThinkingLevel
  // JSON.parse 직후 호출. throw하면 같은 모델로 재시도 → 그래도 실패하면 다음 모델.
  validate?: (parsed: any) => void
}

// 후보 모델을 순서대로 시도하고, 각 모델마다 일시적 오류는 지수 backoff로 재시도한다.
// 반환 타입은 JSON.parse 결과 그대로(any) 느슨히 둔다.
export async function generateJson(prompt: string, opts: GenerateJsonOptions): Promise<any> {
  const { label, models = QUALITY_MODELS } = opts
  let lastError: unknown

  for (const modelName of models) {
    try {
      const parsed = await generateWithRetry(modelName, prompt, opts)
      console.log(`[${label}] Success with model: ${modelName}`)
      return parsed
    } catch (err) {
      if (isBillingError(String(err))) throw err
      // 재시도까지 한 뒤에도 이 모델이 실패하면 다음 후보 모델로 넘어간다.
      console.log(
        `[${label}] Model ${modelName} failed after retries — trying next. ${String(err).slice(0, 200)}`
      )
      lastError = err
      continue
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`)
}

// 일시적(503 과부하 / 429 / 5xx / 네트워크 / 일회성 JSON 파싱) 실패는
// 지수 backoff로 재시도한다. 모델 부재(404)·인증 오류는 재시도해도 의미가 없어 즉시 포기.
async function generateWithRetry(
  modelName: string,
  prompt: string,
  { label, maxRetries = 3, generationConfig, thinking, validate }: GenerateJsonOptions
): Promise<any> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${label}] ${modelName} attempt ${attempt + 1}/${maxRetries + 1}`)
      // 현재 SDK(@google/generative-ai) 타입에는 thinkingConfig가 없지만 그대로 전달된다
      const config = thinking
        ? ({ ...generationConfig, thinkingConfig: thinkingConfigFor(modelName, thinking) } as GenerationConfig)
        : generationConfig
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: config })
      const result = await model.generateContent(prompt)
      const raw = result.response.text().trim()

      const meta = result.response.usageMetadata as any
      if (meta) {
        const usage = {
          input: meta.promptTokenCount ?? 0,
          output: meta.candidatesTokenCount ?? 0,
          thoughts: meta.thoughtsTokenCount ?? 0,
        }
        console.log(
          `[${label}] ${modelName} tokens in=${usage.input} out=${usage.output} thoughts=${usage.thoughts}`
        )
        usageListener?.(label, modelName, usage)
      }

      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found in response')

      const parsed = JSON.parse(jsonMatch[0])
      validate?.(parsed)
      return parsed
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
        msg.includes('403') ||
        isBillingError(msg)
      if (nonRetryable || attempt === maxRetries) throw err

      lastError = err
      const delayMs = Math.min(2000 * 2 ** attempt, 20000) // 2s, 4s, 8s … (최대 20s)
      console.log(
        `[${label}] ${modelName} transient error, retrying in ${delayMs}ms — ${msg.slice(0, 150)}`
      )
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}
