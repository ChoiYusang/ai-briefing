'use client'

import { useEffect, useState } from 'react'
import { DailyBriefing, Article, Term } from '@/lib/types'

// ─── 팔레트 (에디토리얼 — 전형적 AI 색감 배제) ──────────────────────
const PALETTE = [
  { accent: '#C05A28', light: '#FDF0E8' }, // 테라코타
  { accent: '#2B5940', light: '#E8F2EC' }, // 딥 포레스트
  { accent: '#7B1E35', light: '#FAEAED' }, // 와인
  { accent: '#7A5520', light: '#F7EDE0' }, // 브론즈
  { accent: '#2C3E50', light: '#E8EDF2' }, // 딥 슬레이트
]

// ─── 날짜 ─────────────────────────────────────────────────────────────
function fmtDate(lang: 'kr' | 'en') {
  const d = new Date()
  return lang === 'kr'
    ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 24시간 범위 ──────────────────────────────────────────────────────
function fmtTimeRange(generatedAt: string, lang: 'kr' | 'en') {
  const end = new Date(generatedAt)
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  if (lang === 'kr') {
    return `${start.toLocaleString('ko-KR', opts)} ~ ${end.toLocaleString('ko-KR', opts)}`
  }
  return `${start.toLocaleString('en-US', opts)} – ${end.toLocaleString('en-US', opts)}`
}

// ─── 용어 행 ──────────────────────────────────────────────────────────
function TermRow({ term, lang, accent }: { term: Term; lang: 'kr' | 'en'; accent: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #F0EDE6' }} className="last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block w-1 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-sm font-semibold" style={{ color: '#1A1814' }}>
            {lang === 'kr' ? term.termKr : term.termEn}
          </span>
          <span className="text-xs" style={{ color: '#A09890' }}>
            {lang === 'kr' ? term.termEn : term.termKr}
          </span>
        </div>
        <span
          className="text-xs flex-shrink-0 ml-2 transition-transform duration-200"
          style={{ color: '#A09890', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>
      {open && (
        <p className="pb-3 text-sm leading-relaxed pl-4" style={{ color: '#6B6560' }}>
          {lang === 'kr' ? term.explanationKr : term.explanationEn}
        </p>
      )}
    </div>
  )
}

// ─── 기사 카드 ────────────────────────────────────────────────────────
function ArticleCard({ article, index, lang }: { article: Article; index: number; lang: 'kr' | 'en' }) {
  const [termsOpen, setTermsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const color = PALETTE[index % PALETTE.length]

  const title = lang === 'kr' ? article.titleKr : article.titleEn
  const titleAlt = lang === 'kr' ? article.titleEn : article.titleKr
  const summary = lang === 'kr' ? article.summaryKr : article.summaryEn
  const whyMatters = lang === 'kr' ? article.whyMattersKr : article.whyMattersEn

  const pubDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(
        lang === 'kr' ? 'ko-KR' : 'en-US',
        { month: 'short', day: 'numeric' }
      )
    : ''

  const hasImage = !!article.imageUrl && !imgError

  return (
    <div
      id={`article-${index}`}
      className="bg-white overflow-hidden"
      style={{
        borderRadius: 16,
        border: '1px solid #E5E0D5',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* 이미지 — 원문 사진이 있을 때만 원본 비율 그대로 렌더링 */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl!}
          alt={title}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onError={() => setImgError(true)}
        />
      )}

      <div className="px-5 pt-5 pb-6">
        {/* 번호 태그 + 출처 */}
        <div className="flex items-center gap-2.5 mb-3">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded"
            style={{
              backgroundColor: color.light,
              color: color.accent,
              letterSpacing: '0.04em',
            }}
          >
            #{String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-xs" style={{ color: '#A09890' }}>
            {article.source}{pubDate && ` · ${pubDate}`}
          </span>
        </div>

        {/* 제목 */}
        <h2
          className="font-bold leading-tight mb-1"
          style={{ fontSize: 17, color: '#1A1814', letterSpacing: '-0.3px' }}
        >
          {title}
        </h2>
        <p className="text-xs mb-4" style={{ color: '#B0A898', fontStyle: 'italic' }}>
          {titleAlt}
        </p>

        {/* 구분선 */}
        <div style={{ height: 1, backgroundColor: '#F0EDE6', marginBottom: 16 }} />

        {/* 요약 */}
        <p
          className="leading-relaxed"
          style={{ fontSize: 14, color: '#3D3A36', lineHeight: 1.9 }}
        >
          {summary}
        </p>

        {/* 용어 설명 */}
        {article.terms?.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: termsOpen ? color.light : '#F8F5EF',
                border: `1px solid ${termsOpen ? color.accent + '35' : '#EAE5DC'}`,
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>📖</span>
                <span className="text-xs font-semibold" style={{ color: '#1A1814' }}>
                  {lang === 'kr'
                    ? `용어 설명 ${article.terms.length}개`
                    : `${article.terms.length} Terms Explained`}
                </span>
              </div>
              <span
                className="text-xs transition-transform duration-200"
                style={{
                  color: color.accent,
                  display: 'inline-block',
                  transform: termsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▾
              </span>
            </button>

            {termsOpen && (
              <div
                className="mt-2 px-4 rounded-xl"
                style={{ backgroundColor: '#FDFCF9', border: '1px solid #EAE5DC' }}
              >
                {article.terms.map((term, i) => (
                  <TermRow key={i} term={term} lang={lang} accent={color.accent} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 왜 중요한가 */}
        <div
          className="mt-4 rounded-xl"
          style={{
            borderLeft: `3px solid ${color.accent}`,
            backgroundColor: color.light,
            padding: '14px 16px',
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-wider mb-1.5"
            style={{ color: color.accent, letterSpacing: '0.08em' }}
          >
            {lang === 'kr' ? '왜 중요한가' : 'Why it matters'}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#4E4A45' }}>
            {whyMatters}
          </p>
        </div>

        {/* 원문 링크 */}
        <div className="mt-4 flex justify-end">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold transition-opacity"
            style={{ color: color.accent, textDecoration: 'none', letterSpacing: '0.02em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.7' }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
          >
            {lang === 'kr' ? '원문 보기 →' : 'Read original →'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── 목차 ─────────────────────────────────────────────────────────────
function TableOfContents({ articles, lang }: { articles: Article[]; lang: 'kr' | 'en' }) {
  const scrollTo = (index: number) => {
    document.getElementById(`article-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        borderRadius: 16,
        border: '1px solid #E5E0D5',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #F0EDE6' }}>
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: '#B0A898', letterSpacing: '0.12em' }}
        >
          Index
        </p>
      </div>
      <div>
        {articles.map((article, i) => {
          const color = PALETTE[i % PALETTE.length]
          return (
            <button
              key={article.id}
              onClick={() => scrollTo(i)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors"
              style={{
                borderBottom: i < articles.length - 1 ? '1px solid #F8F5F0' : 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FAFAF5'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              }}
            >
              <span
                className="text-xs font-bold flex-shrink-0"
                style={{ color: color.accent, minWidth: 24 }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className="text-sm font-medium leading-snug flex-1"
                style={{ color: '#1A1814' }}
              >
                {lang === 'kr' ? article.titleKr : article.titleEn}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: '#D5CFC6' }}>
                →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-3">
      <div
        className="bg-white animate-pulse overflow-hidden"
        style={{ borderRadius: 16, border: '1px solid #E5E0D5' }}
      >
        <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #F0EDE6' }}>
          <div className="h-2.5 rounded w-10" style={{ backgroundColor: '#EDE9E0' }} />
        </div>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: '1px solid #F8F5F0' }}
          >
            <div className="w-5 h-3 rounded" style={{ backgroundColor: '#EDE9E0' }} />
            <div className="h-3.5 rounded flex-1" style={{ backgroundColor: '#EDE9E0' }} />
          </div>
        ))}
      </div>
      {[1, 2].map(i => (
        <div
          key={i}
          className="bg-white animate-pulse overflow-hidden"
          style={{ borderRadius: 16, border: '1px solid #E5E0D5' }}
        >
          <div className="h-36" style={{ backgroundColor: '#F5F2EA' }} />
          <div className="p-5 space-y-3">
            <div className="flex gap-2 items-center">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: '#EDE9E0' }} />
              <div className="h-3 rounded w-24" style={{ backgroundColor: '#EDE9E0' }} />
            </div>
            <div className="h-5 rounded w-4/5" style={{ backgroundColor: '#EDE9E0' }} />
            <div className="h-3 rounded w-full" style={{ backgroundColor: '#F0EDE6' }} />
            <div className="h-3 rounded w-5/6" style={{ backgroundColor: '#F0EDE6' }} />
            <div className="h-3 rounded w-2/3" style={{ backgroundColor: '#F0EDE6' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────────────────
export default function Home() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lang, setLang] = useState<'kr' | 'en'>('kr')

  useEffect(() => {
    fetch('/api/briefing')
      .then(res => { if (!res.ok) throw new Error('not found'); return res.json() })
      .then(data => { setBriefing(data); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const lastUpdated = briefing
    ? new Date(briefing.generatedAt).toLocaleString(lang === 'kr' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const timeRange = briefing ? fmtTimeRange(briefing.generatedAt, lang) : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F3F0E8' }}>

      {/* ── 헤더 ── */}
      <div style={{ backgroundColor: '#141210' }}>
        <div className="max-w-xl mx-auto px-5 pt-7 pb-7">

          {/* 1행: Made By yusang (우측 정렬) */}
          <div className="flex justify-end mb-4">
            <p className="text-xs font-medium" style={{ color: '#5A5048', letterSpacing: '0.03em' }}>
              Made By yusang
            </p>
          </div>

          {/* 2행: 제목 + 언어 토글 */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                className="font-bold text-white"
                style={{ fontSize: 24, letterSpacing: '-0.5px', lineHeight: 1.2 }}
              >
                {lang === 'kr' ? 'AI 데일리 브리핑' : 'AI Daily Briefing'}
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: '#7A6E5E' }}>
                {fmtDate(lang)}
              </p>
            </div>

            {/* 언어 토글 */}
            <div
              className="flex items-center rounded-full flex-shrink-0 mt-0.5"
              style={{
                backgroundColor: '#1E1A16',
                border: '1px solid #302820',
                padding: 3,
              }}
            >
              {(['kr', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={
                    lang === l
                      ? { backgroundColor: '#F3F0E8', color: '#141210' }
                      : { color: '#5A5048' }
                  }
                >
                  {l === 'kr' ? '한국어' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* 3행: 업데이트 문구 */}
          <p className="mt-3 text-xs" style={{ color: '#6A5E4E' }}>
            {lang === 'kr'
              ? '매일 오전 9시에 AI를 통해 자동 업데이트 됩니다'
              : 'Auto-updated by AI every morning at 9 AM KST'}
          </p>

          {/* 4행: 기사 수 + 시간 범위 */}
          {briefing && (
            <div
              className="flex items-start gap-3 mt-4 rounded-xl"
              style={{ backgroundColor: '#1E1A16', padding: '12px 14px' }}
            >
              <span
                className="text-sm font-bold flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: '#C05A28', color: '#fff', fontSize: 12 }}
              >
                {briefing.articles.length}
              </span>
              <div>
                {timeRange && (
                  <p className="text-xs mb-0.5" style={{ color: '#6A5E4E' }}>
                    {timeRange}
                  </p>
                )}
                <p className="text-sm font-medium" style={{ color: '#C8C0B4' }}>
                  {lang === 'kr'
                    ? '이 동안 발생한 핵심 AI 이슈에요'
                    : 'Key AI stories from this period'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 컨텐츠 ── */}
      <div className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <Skeleton />
        ) : error || !briefing ? (
          <div
            className="bg-white p-12 text-center"
            style={{ borderRadius: 16, border: '1px solid #E5E0D5' }}
          >
            <p className="text-4xl mb-4">📭</p>
            <p className="font-bold mb-1" style={{ fontSize: 16, color: '#1A1814' }}>
              {lang === 'kr' ? '아직 오늘의 브리핑이 없어요' : 'No briefing available yet'}
            </p>
            <p className="text-sm" style={{ color: '#A09890' }}>
              {lang === 'kr'
                ? '매일 오전 9시에 새 브리핑이 생성됩니다.'
                : 'A new briefing is generated every morning at 9 AM KST.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 목차 */}
            <TableOfContents articles={briefing.articles} lang={lang} />

            {/* 구분선 */}
            <div className="flex items-center gap-3 px-1 py-2">
              <div className="flex-1 h-px" style={{ backgroundColor: '#DDD8CE' }} />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: '#B0A898', letterSpacing: '0.1em' }}
              >
                Articles
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#DDD8CE' }} />
            </div>

            {/* 기사 카드 */}
            {briefing.articles.map((article, i) => (
              <ArticleCard key={article.id} article={article} index={i} lang={lang} />
            ))}

            {/* 푸터 */}
            <div className="text-center py-8 px-4">
              <p className="text-xs leading-relaxed" style={{ color: '#A09890' }}>
                {lang === 'kr'
                  ? 'AI가 자동 수집·요약한 정보입니다.\n중요한 결정 전에 원문을 직접 확인하세요.'
                  : 'AI-curated and summarized content.\nVerify original sources before important decisions.'}
              </p>
              {lastUpdated && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: '#C05A28' }}
                  />
                  <p className="text-xs" style={{ color: '#C0B8AE' }}>
                    {lang === 'kr' ? `마지막 업데이트 ${lastUpdated}` : `Last updated ${lastUpdated}`}
                  </p>
                </div>
              )}
              <p
                className="text-xs mt-3 font-medium"
                style={{ color: '#C0B8AE', letterSpacing: '0.03em' }}
              >
                Made By yusang
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
