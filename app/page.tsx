'use client'

import { useEffect, useRef, useState } from 'react'
import { DailyBriefing, Article, Term } from '@/lib/types'

// ─── 팔레트 ───────────────────────────────────────────────────────────
const PALETTE = [
  { border: '#3182F6', soft: '#EFF6FF', icon: '🤖' },
  { border: '#00C471', soft: '#EDFBF4', icon: '🔬' },
  { border: '#FF8C00', soft: '#FFF8F0', icon: '🏢' },
  { border: '#8B5CF6', soft: '#F5F3FF', icon: '⚡' },
  { border: '#EF4444', soft: '#FEF2F2', icon: '🌐' },
]

// ─── 날짜 ─────────────────────────────────────────────────────────────
function fmtDate(lang: 'kr' | 'en') {
  const d = new Date()
  return lang === 'kr'
    ? d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
    : d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 용어 행 ──────────────────────────────────────────────────────────
function TermRow({ term, lang, accent }: { term: Term; lang: 'kr' | 'en'; accent: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: '#F2F4F6' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left group"
      >
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accent }}
          />
          <span className="text-sm font-semibold" style={{ color: '#191F28' }}>
            {lang === 'kr' ? term.termKr : term.termEn}
          </span>
          <span className="text-xs" style={{ color: '#8B95A1' }}>
            {lang === 'kr' ? term.termEn : term.termKr}
          </span>
        </div>
        <span
          className="text-xs flex-shrink-0 ml-2 transition-transform duration-200"
          style={{ color: accent, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>
      {open && (
        <p
          className="pb-3 text-sm leading-relaxed pl-3.5"
          style={{ color: '#6B7684' }}
        >
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
    ? new Date(article.publishedAt).toLocaleDateString(lang === 'kr' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
    : ''

  const hasImage = article.imageUrl && !imgError

  return (
    <div
      id={`article-${index}`}
      className="bg-white overflow-hidden"
      style={{
        borderRadius: 20,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        border: '1px solid #F2F4F6',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)' }}
    >
      {/* 상단 컬러 바 */}
      <div className="h-1" style={{ backgroundColor: color.border }} />

      {/* 이미지 */}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl!}
          alt={title}
          className="w-full"
          style={{ display: 'block', height: 'auto' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full flex flex-col items-center justify-center gap-2"
          style={{
            height: 140,
            background: `linear-gradient(135deg, ${color.soft} 0%, ${color.border}15 100%)`,
          }}
        >
          <span className="text-4xl">{color.icon}</span>
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: color.border }}>
            AI NEWS
          </span>
        </div>
      )}

      <div className="px-6 pt-5 pb-6">
        {/* 출처 + 번호 */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color.border }}
          >
            {index + 1}
          </span>
          <span className="text-xs font-medium" style={{ color: '#8B95A1' }}>
            {article.source}{pubDate && ` · ${pubDate}`}
          </span>
        </div>

        {/* 제목 */}
        <h2 className="font-bold leading-snug mb-1" style={{ fontSize: 18, color: '#191F28' }}>
          {title}
        </h2>
        <p className="text-sm mb-5" style={{ color: '#8B95A1' }}>{titleAlt}</p>

        {/* 요약 */}
        <p className="leading-relaxed" style={{ fontSize: 15, color: '#4E5968', lineHeight: 1.8 }}>
          {summary}
        </p>

        {/* 용어 설명 */}
        {article.terms?.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
              style={{
                backgroundColor: termsOpen ? color.soft : '#F8F9FA',
                border: `1px solid ${termsOpen ? color.border + '40' : '#E5E8EB'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📖</span>
                <span className="text-sm font-semibold" style={{ color: '#191F28' }}>
                  {lang === 'kr' ? `용어 설명 ${article.terms.length}개` : `${article.terms.length} Terms Explained`}
                </span>
              </div>
              <span
                className="text-xs transition-transform duration-200 font-medium"
                style={{ color: color.border, transform: termsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                ▼
              </span>
            </button>

            {termsOpen && (
              <div
                className="mt-2 px-4 rounded-xl"
                style={{ backgroundColor: '#FAFBFC', border: '1px solid #E5E8EB' }}
              >
                {article.terms.map((term, i) => (
                  <TermRow key={i} term={term} lang={lang} accent={color.border} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 왜 중요한가 */}
        <div
          className="mt-4 p-4 rounded-xl"
          style={{ backgroundColor: color.soft, border: `1px solid ${color.border}20` }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: color.border }}>
            {lang === 'kr' ? '💡 왜 중요한가?' : '💡 Why does this matter?'}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#4E5968' }}>{whyMatters}</p>
        </div>

        {/* 원문 링크 */}
        <div className="mt-4 flex justify-end">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold px-4 py-2 rounded-full transition-all"
            style={{
              color: color.border,
              border: `1.5px solid ${color.border}`,
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              const t = e.currentTarget
              t.style.backgroundColor = color.border
              t.style.color = '#fff'
            }}
            onMouseLeave={e => {
              const t = e.currentTarget
              t.style.backgroundColor = 'transparent'
              t.style.color = color.border
            }}
          >
            {lang === 'kr' ? '원문 보기 →' : 'Read original →'}
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── 목차 카드 ────────────────────────────────────────────────────────
function TableOfContents({ articles, lang }: { articles: Article[]; lang: 'kr' | 'en' }) {
  const scrollTo = (index: number) => {
    document.getElementById(`article-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      className="bg-white p-6"
      style={{ borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F2F4F6' }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#8B95A1' }}>
        {lang === 'kr' ? '오늘의 브리핑' : "Today's Briefing"}
      </p>
      <div className="space-y-1">
        {articles.map((article, i) => {
          const color = PALETTE[i % PALETTE.length]
          return (
            <button
              key={article.id}
              onClick={() => scrollTo(i)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group"
              style={{ border: '1px solid transparent' }}
              onMouseEnter={e => {
                const t = e.currentTarget
                t.style.backgroundColor = color.soft
                t.style.borderColor = color.border + '30'
              }}
              onMouseLeave={e => {
                const t = e.currentTarget
                t.style.backgroundColor = 'transparent'
                t.style.borderColor = 'transparent'
              }}
            >
              <span
                className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color.border }}
              >
                {i + 1}
              </span>
              <span
                className="text-sm font-medium leading-snug flex-1 text-left"
                style={{ color: '#191F28' }}
              >
                {lang === 'kr' ? article.titleKr : article.titleEn}
              </span>
              <span className="text-xs flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: color.border }}>
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
    <div className="space-y-4">
      <div className="bg-white p-6 animate-pulse" style={{ borderRadius: 20, border: '1px solid #F2F4F6' }}>
        <div className="h-3 bg-gray-200 rounded w-32 mb-4" />
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="w-6 h-6 rounded-full bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
          </div>
        ))}
      </div>
      {[1, 2].map(i => (
        <div key={i} className="bg-white overflow-hidden animate-pulse" style={{ borderRadius: 20, border: '1px solid #F2F4F6' }}>
          <div className="h-1 bg-gray-200" />
          <div className="h-36 bg-gray-100" />
          <div className="p-6 space-y-3">
            <div className="flex gap-2"><div className="w-7 h-7 rounded-full bg-gray-200" /><div className="h-3 bg-gray-200 rounded w-24" /></div>
            <div className="h-5 bg-gray-200 rounded w-4/5" />
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
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
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F6F7' }}>

      {/* ── 헤더 ── */}
      <div style={{ background: 'linear-gradient(160deg, #0A1628 0%, #0F2D5A 100%)' }}>
        <div className="max-w-xl mx-auto px-4 pt-10 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#3B82F6' }}>
            {lang === 'kr' ? '매일 오전 9시 업데이트' : 'Updated every morning at 9 AM KST'}
          </p>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-bold text-white" style={{ fontSize: 26, letterSpacing: '-0.5px' }}>
                {lang === 'kr' ? 'AI 데일리 브리핑' : 'AI Daily Briefing'}
              </h1>
              <p className="mt-1 text-sm" style={{ color: '#7EB3F7' }}>{fmtDate(lang)}</p>
            </div>

            {/* 언어 토글 */}
            <div
              className="flex items-center rounded-full p-1 flex-shrink-0 mt-1"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
            >
              {(['kr', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={
                    lang === l
                      ? { backgroundColor: '#fff', color: '#0A1628' }
                      : { color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  {l === 'kr' ? '한국어' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {briefing && (
            <div className="flex items-center gap-2 mt-5">
              <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: '#3182F6' }}>
                {briefing.articles.length}
              </span>
              <span className="text-sm" style={{ color: '#7EB3F7' }}>
                {lang === 'kr' ? '오늘의 핵심 AI 이슈' : 'Key AI stories today'}
              </span>
              {lastUpdated && (
                <span className="text-xs ml-auto" style={{ color: '#4B7AB3' }}>
                  {lang === 'kr' ? `업데이트 ${lastUpdated}` : `Updated ${lastUpdated}`}
                </span>
              )}
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
            style={{ borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
          >
            <p className="text-4xl mb-4">📭</p>
            <p className="font-bold mb-1" style={{ fontSize: 16, color: '#191F28' }}>
              {lang === 'kr' ? '아직 오늘의 브리핑이 없어요' : 'No briefing available yet'}
            </p>
            <p className="text-sm" style={{ color: '#8B95A1' }}>
              {lang === 'kr' ? '매일 오전 9시에 새 브리핑이 생성됩니다.' : 'A new briefing is generated every morning at 9 AM KST.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 목차 */}
            <TableOfContents articles={briefing.articles} lang={lang} />

            {/* 구분선 */}
            <div className="flex items-center gap-3 px-1 py-1">
              <div className="flex-1 h-px" style={{ backgroundColor: '#E5E8EB' }} />
              <span className="text-xs font-semibold" style={{ color: '#8B95A1' }}>
                {lang === 'kr' ? '기사 전문' : 'Full Articles'}
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#E5E8EB' }} />
            </div>

            {/* 기사 카드 */}
            {briefing.articles.map((article, i) => (
              <ArticleCard key={article.id} article={article} index={i} lang={lang} />
            ))}

            {/* 푸터 */}
            <div className="text-center py-8 px-2">
              <p className="text-xs leading-relaxed" style={{ color: '#8B95A1' }}>
                {lang === 'kr'
                  ? '이 브리핑은 AI가 자동으로 수집·요약한 정보입니다.\n중요한 결정에는 원문 기사를 직접 확인하세요.'
                  : 'This briefing is AI-curated and summarized.\nVerify original sources before making important decisions.'}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00C471' }} />
                <p className="text-xs" style={{ color: '#B0B8C1' }}>
                  {lang === 'kr' ? `마지막 업데이트 ${lastUpdated}` : `Last updated ${lastUpdated}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
