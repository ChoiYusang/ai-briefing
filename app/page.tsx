'use client'

import { useEffect, useState } from 'react'
import { DailyBriefing, Article, Term } from '@/lib/types'

// ─── 색상 팔레트 (기사별로 다른 색상) ───────────────────────────────
const PALETTE = [
  { border: '#3182F6', bg: '#EFF6FF', label: '🤖 AI & Tech' },
  { border: '#00C471', bg: '#EDFBF4', label: '🔬 Research' },
  { border: '#FF8C00', bg: '#FFF8F0', label: '🏢 Industry' },
  { border: '#8B5CF6', bg: '#F5F3FF', label: '⚡ Breakthrough' },
  { border: '#EF4444', bg: '#FEF2F2', label: '🌐 Society' },
]

// ─── 날짜 포맷 ────────────────────────────────────────────────────────
function formatDate(lang: 'kr' | 'en') {
  const d = new Date()
  if (lang === 'kr') {
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
  }
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 용어 칩 ─────────────────────────────────────────────────────────
function TermChip({ term, lang }: { term: Term; lang: 'kr' | 'en' }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
      >
        {lang === 'kr' ? term.termKr : term.termEn}
        <span className="text-gray-400 text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <p className="mt-2 ml-1 text-sm text-gray-600 leading-relaxed">
          {lang === 'kr' ? term.explanationKr : term.explanationEn}
        </p>
      )}
    </div>
  )
}

// ─── 기사 카드 ────────────────────────────────────────────────────────
function ArticleCard({ article, lang }: { article: Article; lang: 'kr' | 'en' }) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const color = PALETTE[article.colorIndex % PALETTE.length]

  const title = lang === 'kr' ? article.titleKr : article.titleEn
  const summary = lang === 'kr' ? article.summaryKr : article.summaryEn
  const whyMatters = lang === 'kr' ? article.whyMattersKr : article.whyMattersEn

  const PREVIEW_LEN = 220
  const isLong = summary.length > PREVIEW_LEN

  const pubDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(lang === 'kr' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
      })
    : ''

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm"
      style={{ border: '1px solid #F0F0F0' }}
    >
      {/* 상단 컬러 바 */}
      <div className="h-[3px]" style={{ backgroundColor: color.border }} />

      {/* 이미지 영역 */}
      {article.imageUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl}
          alt={title}
          className="w-full object-cover"
          style={{ maxHeight: 220 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="w-full flex flex-col items-center justify-center py-10 gap-1"
          style={{ background: `linear-gradient(135deg, ${color.bg}, ${color.border}18)` }}
        >
          <span className="text-3xl">{color.label.split(' ')[0]}</span>
          <span className="text-xs font-semibold tracking-wide" style={{ color: color.border }}>
            {color.label.replace(/^.+ /, '')}
          </span>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="px-5 pt-4 pb-5">
        {/* 번호 + 출처 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color.border }}
            >
              {article.colorIndex + 1}
            </span>
            <span className="text-xs text-gray-400 font-medium">
              {article.source}
              {pubDate && ` · ${pubDate}`}
            </span>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-[17px] font-bold text-gray-900 leading-snug mb-4">{title}</h2>

        {/* 요약 */}
        <p className="text-[15px] text-gray-600 leading-7">
          {expanded || !isLong ? summary : summary.slice(0, PREVIEW_LEN) + '…'}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm font-semibold transition-colors"
            style={{ color: color.border }}
          >
            {expanded
              ? lang === 'kr' ? '접기 ↑' : 'Show less ↑'
              : lang === 'kr' ? '더 보기 ↓' : 'Read more ↓'}
          </button>
        )}

        {/* 용어 설명 */}
        {article.terms?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
              {lang === 'kr' ? '용어 설명' : 'Key Terms'}
            </p>
            <div className="flex flex-wrap gap-2">
              {article.terms.map((term, i) => (
                <TermChip key={i} term={term} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* 왜 중요한가 */}
        <div
          className="mt-4 rounded-xl p-4"
          style={{ backgroundColor: color.bg }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-2"
            style={{ color: color.border }}
          >
            {lang === 'kr' ? '💡 왜 중요한가?' : '💡 Why does this matter?'}
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">{whyMatters}</p>
        </div>

        {/* 원문 링크 */}
        <div className="mt-4 flex justify-end">
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold px-4 py-1.5 rounded-full border transition-all hover:text-white hover:shadow-sm"
            style={{
              color: color.border,
              borderColor: color.border,
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

// ─── 스켈레톤 ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
          <div className="h-[3px] bg-gray-200" />
          <div className="h-40 bg-gray-100" />
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-5 bg-gray-200 rounded w-4/5" />
            <div className="h-5 bg-gray-200 rounded w-3/5" />
            <div className="space-y-2 mt-2">
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────
export default function Home() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lang, setLang] = useState<'kr' | 'en'>('kr')

  useEffect(() => {
    fetch('/api/briefing')
      .then(res => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then(data => {
        setBriefing(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  const lastUpdated = briefing
    ? new Date(briefing.generatedAt).toLocaleString(lang === 'kr' ? 'ko-KR' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F2F4F6' }}>
      {/* ── 헤더 ── */}
      <div style={{ background: 'linear-gradient(160deg, #0A1628 0%, #162B4D 100%)' }}>
        <div className="max-w-xl mx-auto px-4 pt-10 pb-8">
          {/* 상단 라벨 */}
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">
            {lang === 'kr' ? '매일 오전 9시 업데이트' : 'Updated every morning at 9 AM KST'}
          </p>

          {/* 제목 + 언어 토글 */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {lang === 'kr' ? 'AI 데일리 브리핑' : 'AI Daily Briefing'}
              </h1>
              <p className="text-blue-300 text-sm mt-1">{formatDate(lang)}</p>
            </div>

            {/* 언어 토글 */}
            <div
              className="flex items-center rounded-full p-1 flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              {(['kr', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                  style={
                    lang === l
                      ? { backgroundColor: '#fff', color: '#0A1628' }
                      : { color: 'rgba(255,255,255,0.6)' }
                  }
                >
                  {l === 'kr' ? '한국어' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* 기사 수 뱃지 */}
          {briefing && (
            <div className="flex items-center gap-2 mt-4">
              <span
                className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#3182F6' }}
              >
                {briefing.articles.length}
              </span>
              <span className="text-blue-300 text-sm">
                {lang === 'kr' ? '오늘의 핵심 AI 이슈' : 'Key AI stories today'}
              </span>
              {lastUpdated && (
                <span className="text-blue-400 text-xs ml-auto">
                  {lang === 'kr' ? `업데이트 ${lastUpdated}` : `Updated ${lastUpdated}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div className="max-w-xl mx-auto px-4 py-5">
        {loading ? (
          <Skeleton />
        ) : error || !briefing ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-base font-bold text-gray-700 mb-1">
              {lang === 'kr' ? '아직 오늘의 브리핑이 없어요' : 'No briefing available yet'}
            </p>
            <p className="text-sm text-gray-400">
              {lang === 'kr'
                ? '매일 오전 9시에 새 브리핑이 생성됩니다.'
                : 'A new briefing is generated every morning at 9 AM KST.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {briefing.articles.map(article => (
              <ArticleCard key={article.id} article={article} lang={lang} />
            ))}

            {/* 푸터 */}
            <div className="text-center py-6 px-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                {lang === 'kr'
                  ? '이 브리핑은 AI가 자동으로 수집·요약한 정보입니다.\n중요한 결정에는 원문 기사를 직접 확인하세요.'
                  : 'This briefing is AI-curated and summarized.\nVerify original sources before making important decisions.'}
              </p>
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-xs text-gray-300">
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
