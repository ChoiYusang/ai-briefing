'use client'

import { useEffect, useState } from 'react'
import { DailyBriefing, Article, Term } from '@/lib/types'

// ─── 팔레트 (토스 컬러 시스템) ────────────────────────────────────────
const PALETTE = [
  { accent: '#3182F6', light: '#EFF6FF' },
  { accent: '#00C471', light: '#EDFBF4' },
  { accent: '#6B5CE7', light: '#F0EEFF' },
  { accent: '#FF8C00', light: '#FFF3E0' },
  { accent: '#E91E8C', light: '#FEE9F5' },
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

// ─── 말풍선 팝업 ──────────────────────────────────────────────────────
function WelcomePopup({ onClose }: { onClose: () => void }) {
  return (
    <>
      <style>{`
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          right: 18,
          zIndex: 999,
          maxWidth: 268,
          animation: 'popupIn 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <div
          style={{
            backgroundColor: '#191F28',
            borderRadius: 18,
            padding: '18px 18px 14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
            position: 'relative',
          }}
        >
          {/* 이모지 */}
          <p style={{ fontSize: 24, marginBottom: 10 }}>🤖</p>

          {/* 본문 */}
          <p
            style={{
              color: '#E8EBF0',
              fontSize: 14,
              lineHeight: 1.65,
              fontWeight: 500,
              letterSpacing: '-0.3px',
            }}
          >
            매일 오전 9시에 AI 핵심 이슈가{' '}
            <span style={{ color: '#60A5FA', fontWeight: 700 }}>Claude AI</span>를 통해{' '}
            자동 업데이트 됩니다
          </p>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            style={{
              marginTop: 14,
              width: '100%',
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.55)',
              padding: '9px 0',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.14)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.08)' }}
          >
            닫기
          </button>

          {/* 말풍선 꼬리 */}
          <div
            style={{
              position: 'absolute',
              bottom: -9,
              right: 32,
              width: 0,
              height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '9px solid #191F28',
            }}
          />
        </div>
      </div>
    </>
  )
}

// ─── 용어 행 ──────────────────────────────────────────────────────────
function TermRow({ term, lang, accent }: { term: Term; lang: 'kr' | 'en'; accent: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #F2F4F6' }} className="last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
        style={{ padding: '12px 0' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 16,
              borderRadius: 2,
              backgroundColor: accent,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#191F28', letterSpacing: '-0.3px' }}>
            {lang === 'kr' ? term.termKr : term.termEn}
          </span>
          <span style={{ fontSize: 12, color: '#8B95A1', letterSpacing: '-0.1px' }}>
            {lang === 'kr' ? term.termEn : term.termKr}
          </span>
        </div>
        <span
          style={{
            color: '#C9D0D8',
            fontSize: 11,
            flexShrink: 0,
            marginLeft: 8,
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <p
          style={{
            paddingBottom: 12,
            paddingLeft: 15,
            fontSize: 13,
            color: '#6B7684',
            lineHeight: 1.75,
            letterSpacing: '-0.2px',
          }}
        >
          {lang === 'kr' ? term.explanationKr : term.explanationEn}
        </p>
      )}
    </div>
  )
}

// ─── 기사 카드 ────────────────────────────────────────────────────────
function ArticleCard({
  article,
  index,
  lang,
}: {
  article: Article
  index: number
  lang: 'kr' | 'en'
}) {
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
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* 원문 이미지 */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.imageUrl!}
          alt={title}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onError={() => setImgError(true)}
        />
      )}

      <div style={{ padding: '20px 20px 22px' }}>
        {/* 번호 뱃지 + 출처 */}
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: color.light,
              color: color.accent,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              letterSpacing: 0,
            }}
          >
            {index + 1}
          </span>
          <span style={{ fontSize: 12, color: '#8B95A1', letterSpacing: '-0.2px' }}>
            {article.source}
            {pubDate && ` · ${pubDate}`}
          </span>
        </div>

        {/* 제목 */}
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#191F28',
            lineHeight: 1.45,
            letterSpacing: '-0.4px',
            marginBottom: 4,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 12,
            color: '#C9D0D8',
            marginBottom: 16,
            letterSpacing: '-0.2px',
            fontStyle: 'italic',
          }}
        >
          {titleAlt}
        </p>

        {/* 구분선 */}
        <div style={{ height: 1, backgroundColor: '#F2F4F6', marginBottom: 16 }} />

        {/* 요약 */}
        <p
          style={{
            fontSize: 14,
            color: '#4E5968',
            lineHeight: 1.9,
            letterSpacing: '-0.2px',
          }}
        >
          {summary}
        </p>

        {/* 용어 설명 */}
        {article.terms?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className="w-full flex items-center justify-between"
              style={{
                padding: '11px 14px',
                borderRadius: 12,
                backgroundColor: termsOpen ? color.light : '#F8F9FA',
                border: `1px solid ${termsOpen ? color.accent + '28' : 'transparent'}`,
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 14 }}>📖</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#191F28',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {lang === 'kr'
                    ? `용어 설명 ${article.terms.length}개`
                    : `${article.terms.length} Terms Explained`}
                </span>
              </div>
              <span
                style={{
                  color: color.accent,
                  fontSize: 11,
                  display: 'inline-block',
                  transition: 'transform 0.2s',
                  transform: termsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                ▾
              </span>
            </button>

            {termsOpen && (
              <div
                style={{
                  marginTop: 8,
                  padding: '0 14px',
                  borderRadius: 12,
                  backgroundColor: '#FAFBFC',
                  border: '1px solid #F2F4F6',
                }}
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
          style={{
            marginTop: 16,
            padding: '14px 14px 14px 13px',
            borderRadius: 12,
            backgroundColor: color.light,
            borderLeft: `3px solid ${color.accent}`,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: color.accent,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}
          >
            {lang === 'kr' ? '왜 중요한가' : 'Why it matters'}
          </p>
          <p
            style={{
              fontSize: 13,
              color: '#4E5968',
              lineHeight: 1.75,
              letterSpacing: '-0.2px',
            }}
          >
            {whyMatters}
          </p>
        </div>

        {/* 원문 링크 */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: color.accent,
              textDecoration: 'none',
              letterSpacing: '-0.2px',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.6' }}
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
function TableOfContents({
  articles,
  lang,
}: {
  articles: Article[]
  lang: 'kr' | 'en'
}) {
  const scrollTo = (index: number) => {
    const el = document.getElementById(`article-${index}`)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 76
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid #F2F4F6',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#B0B8C1',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
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
              className="w-full flex items-center gap-3 text-left"
              style={{
                padding: '13px 20px',
                borderBottom: i < articles.length - 1 ? '1px solid #F8F9FA' : 'none',
                transition: 'background-color 0.12s',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F8F9FA'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  backgroundColor: color.light,
                  color: color.accent,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#191F28',
                  flex: 1,
                  letterSpacing: '-0.3px',
                  lineHeight: 1.4,
                  textAlign: 'left',
                }}
              >
                {lang === 'kr' ? article.titleKr : article.titleEn}
              </span>
              <span style={{ color: '#C9D0D8', fontSize: 13, flexShrink: 0 }}>→</span>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 목차 스켈레톤 */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #F2F4F6' }}>
          <div
            style={{ height: 10, width: 36, backgroundColor: '#F2F4F6', borderRadius: 5 }}
            className="animate-pulse"
          />
        </div>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 animate-pulse"
            style={{
              padding: '13px 20px',
              borderBottom: i < 3 ? '1px solid #F8F9FA' : 'none',
            }}
          >
            <div
              style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: '#F2F4F6', flexShrink: 0 }}
            />
            <div style={{ height: 14, backgroundColor: '#F2F4F6', borderRadius: 7, flex: 1 }} />
          </div>
        ))}
      </div>

      {/* 카드 스켈레톤 */}
      {[1, 2].map(i => (
        <div
          key={i}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
          className="animate-pulse"
        >
          <div style={{ height: 140, backgroundColor: '#F8F9FA' }} />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex items-center gap-2">
              <div style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: '#F2F4F6' }} />
              <div style={{ height: 12, width: 80, backgroundColor: '#F2F4F6', borderRadius: 6 }} />
            </div>
            <div style={{ height: 17, width: '80%', backgroundColor: '#F2F4F6', borderRadius: 8 }} />
            <div style={{ height: 13, backgroundColor: '#F8F9FA', borderRadius: 6 }} />
            <div style={{ height: 13, width: '90%', backgroundColor: '#F8F9FA', borderRadius: 6 }} />
            <div style={{ height: 13, width: '70%', backgroundColor: '#F8F9FA', borderRadius: 6 }} />
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
  const [showPopup, setShowPopup] = useState(false)

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

    // 첫 방문 팝업
    const dismissed = localStorage.getItem('ai-briefing-popup-v1')
    if (!dismissed) setShowPopup(true)
  }, [])

  const handleClosePopup = () => {
    localStorage.setItem('ai-briefing-popup-v1', '1')
    setShowPopup(false)
  }

  const lastUpdated = briefing
    ? new Date(briefing.generatedAt).toLocaleString(
        lang === 'kr' ? 'ko-KR' : 'en-US',
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      )
    : null

  const timeRange = briefing ? fmtTimeRange(briefing.generatedAt, lang) : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F6F8', letterSpacing: '-0.3px' }}>

      {/* ── 말풍선 팝업 ── */}
      {showPopup && <WelcomePopup onClose={handleClosePopup} />}

      {/* ── 고정 헤더 ── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid #F2F4F6',
          zIndex: 500,
        }}
      >
        <div
          style={{
            maxWidth: 576,
            margin: '0 auto',
            padding: '13px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#191F28',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
              }}
            >
              {lang === 'kr' ? 'AI 데일리 브리핑' : 'AI Daily Briefing'}
            </p>
            <p
              style={{
                fontSize: 12,
                color: '#8B95A1',
                marginTop: 2,
                letterSpacing: '-0.2px',
              }}
            >
              {fmtDate(lang)}
            </p>
          </div>

          {/* 언어 토글 pill */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F2F4F6',
              borderRadius: 24,
              padding: 3,
              flexShrink: 0,
            }}
          >
            {(['kr', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '-0.2px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  ...(lang === l
                    ? {
                        backgroundColor: '#FFFFFF',
                        color: '#191F28',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: '#8B95A1',
                      }),
                }}
              >
                {l === 'kr' ? '한국어' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 메인 컨텐츠 ── */}
      <main style={{ maxWidth: 576, margin: '0 auto', padding: '82px 16px 48px' }}>

        {/* 상단 정보 바 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            padding: '0 2px',
          }}
        >
          <p style={{ fontSize: 12, color: '#8B95A1', letterSpacing: '-0.2px' }}>
            {lang === 'kr'
              ? '매일 오전 9시에 AI를 통해 자동 업데이트 됩니다'
              : 'Auto-updated by AI every morning at 9 AM KST'}
          </p>
          <p
            style={{
              fontSize: 11,
              color: '#C9D0D8',
              letterSpacing: '-0.1px',
              flexShrink: 0,
              marginLeft: 8,
              fontWeight: 500,
            }}
          >
            Made By yusang
          </p>
        </div>

        {/* 기사 수 + 시간 범위 카드 */}
        {briefing && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              padding: '16px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#3182F6',
                  letterSpacing: '-0.5px',
                }}
              >
                {briefing.articles.length}
              </span>
            </div>
            <div>
              {timeRange && (
                <p
                  style={{
                    fontSize: 11,
                    color: '#8B95A1',
                    marginBottom: 3,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {timeRange}
                </p>
              )}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#191F28',
                  letterSpacing: '-0.3px',
                }}
              >
                {lang === 'kr'
                  ? '이 동안 발생한 핵심 AI 이슈에요'
                  : 'Key AI stories from this period'}
              </p>
            </div>
          </div>
        )}

        {/* 로딩 / 에러 / 컨텐츠 */}
        {loading ? (
          <Skeleton />
        ) : error || !briefing ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              padding: '52px 20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 40, marginBottom: 16 }}>📭</p>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#191F28',
                letterSpacing: '-0.4px',
                marginBottom: 6,
              }}
            >
              {lang === 'kr' ? '아직 오늘의 브리핑이 없어요' : 'No briefing available yet'}
            </p>
            <p style={{ fontSize: 14, color: '#8B95A1', letterSpacing: '-0.2px' }}>
              {lang === 'kr'
                ? '매일 오전 9시에 새 브리핑이 생성됩니다.'
                : 'A new briefing is generated every morning at 9 AM KST.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 목차 */}
            <TableOfContents articles={briefing.articles} lang={lang} />

            {/* 구분선 */}
            <div
              className="flex items-center gap-3"
              style={{ padding: '6px 4px' }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: '#E8EAED' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#B0B8C1',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                }}
              >
                Articles
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#E8EAED' }} />
            </div>

            {/* 기사 카드 */}
            {briefing.articles.map((article, i) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={i}
                lang={lang}
              />
            ))}

            {/* 푸터 */}
            <div style={{ textAlign: 'center', padding: '24px 16px 12px' }}>
              <p
                style={{
                  fontSize: 12,
                  color: '#B0B8C1',
                  lineHeight: 1.7,
                  letterSpacing: '-0.2px',
                }}
              >
                {lang === 'kr'
                  ? 'AI가 자동 수집·요약한 정보입니다.\n중요한 결정 전에 원문을 직접 확인하세요.'
                  : 'AI-curated and summarized.\nVerify sources before important decisions.'}
              </p>
              {lastUpdated && (
                <div
                  className="flex items-center justify-center gap-1.5"
                  style={{ marginTop: 10 }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: '#3182F6',
                    }}
                  />
                  <p style={{ fontSize: 12, color: '#B0B8C1', letterSpacing: '-0.2px' }}>
                    {lang === 'kr'
                      ? `마지막 업데이트 ${lastUpdated}`
                      : `Last updated ${lastUpdated}`}
                  </p>
                </div>
              )}
              <p
                style={{
                  fontSize: 12,
                  color: '#C9D0D8',
                  marginTop: 10,
                  letterSpacing: '-0.1px',
                  fontWeight: 500,
                }}
              >
                Made By yusang
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
