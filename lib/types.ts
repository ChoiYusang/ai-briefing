export interface Term {
  termKr: string
  termEn: string
  explanationKr: string
  explanationEn: string
}

export interface Article {
  id: string
  titleKr: string
  titleEn: string
  imageUrl?: string
  summaryKr: string
  summaryEn: string
  terms: Term[]
  whyMattersKr: string
  whyMattersEn: string
  source: string
  sourceUrl: string
  publishedAt: string
  colorIndex: number
}

export interface DailyBriefing {
  date: string
  generatedAt: string
  articles: Article[]
}
