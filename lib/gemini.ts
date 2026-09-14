import { GenerationConfig, GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// 브리핑 생성처럼 품질이 중요한 작업용 (앞에서부터 순서대로 시도)
export const QUALITY_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

// 사전 조회처럼 사용자가 기다리는 작업용 — 빠른 모델만, 폴백도 짧게
export const FAST_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']

export interface GenerateJsonOptions {
  label: string
  models?: string[]
  maxRetries?: number
  generationConfig?: GenerationConfig
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
  { label, maxRetries = 3, generationConfig, validate }: GenerateJsonOptions
): Promise<any> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${label}] ${modelName} attempt ${attempt + 1}/${maxRetries + 1}`)
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig })
      const result = await model.generateContent(prompt)
      const raw = result.response.text().trim()

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
        msg.includes('403')
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
