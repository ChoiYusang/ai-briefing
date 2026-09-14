'use client'

import { LookupKind, LookupResult } from '@/lib/types'
import { canSpeak, speak } from '@/lib/speak'
import BottomSheet from './BottomSheet'

export interface LookupState {
  open: boolean
  query: string
  status: 'loading' | 'done' | 'error'
  result: LookupResult | null
  message: string
  // glossary = 미리 만들어 둔 오늘치 사전에서 즉시 꺼낸 결과 (네트워크 0)
  source: 'glossary' | 'api'
}

const KIND_LABEL: Record<LookupKind, string> = {
  word: '단어',
  phrase: '표현',
  sentence: '문장',
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#B0B8C1',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

export default function LookupSheet({
  state,
  saved,
  onSave,
  onRetry,
  onExpand,
  onClose,
}: {
  state: LookupState
  saved: boolean
  onSave: () => void
  onRetry: () => void
  onExpand: () => void
  onClose: () => void
}) {
  const { query, status, result, message } = state
  const isKorean = result?.direction === 'ko-en'
  // 번역과 똑같은 한 줄뿐이면 '뜻' 섹션은 중복이라 접고, 품사만 헤더로 올린다
  const showSenses =
    !!result &&
    result.senses.length > 0 &&
    !(
      result.senses.length === 1 &&
      !result.senses[0].example &&
      result.senses[0].meaningKr === result.translation
    )
  const headerPos = result && !showSenses ? result.senses[0]?.pos : null
  // 영어 쪽을 읽어 준다 — 영→한이면 긁은 원문, 한→영이면 번역 결과
  const speakTarget = isKorean ? result?.translation ?? '' : query
  const longQuery = query.length > 40

  return (
    <BottomSheet open={state.open} onClose={onClose}>
      {/* ── 헤더 ── */}
      <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid #F2F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: 6,
                  backgroundColor: '#EFF6FF',
                  color: '#3182F6',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {result ? KIND_LABEL[result.kind] : '찾는 중'}
              </span>
              {headerPos && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: '#F2F4F6',
                    color: '#3182F6',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {headerPos}
                </span>
              )}
              {result?.level && (
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 6,
                    backgroundColor: '#F2F4F6',
                    color: '#6B7684',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {result.level}
                </span>
              )}
            </div>

            <p
              style={{
                fontSize: longQuery ? 16 : 21,
                fontWeight: 700,
                color: '#191F28',
                lineHeight: 1.45,
                letterSpacing: '-0.5px',
                wordBreak: 'break-word',
              }}
            >
              {query}
            </p>

            {(result?.pronunciation || (canSpeak() && speakTarget)) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                {result?.pronunciation && (
                  <span style={{ fontSize: 13, color: '#8B95A1', letterSpacing: 0 }}>
                    {result.pronunciation}
                  </span>
                )}
                {canSpeak() && speakTarget && (
                  <button
                    onClick={() => speak(speakTarget)}
                    aria-label="발음 듣기"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      borderRadius: 9,
                      border: '1px solid #E5E8EB',
                      backgroundColor: '#FFFFFF',
                      color: '#4E5968',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔊 듣기
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#F2F4F6',
              color: '#8B95A1',
              fontSize: 15,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── 본문 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 20px' }}>
        {status === 'loading' && <LoadingBody />}

        {status === 'error' && (
          <div style={{ padding: '18px 0 6px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>😵</p>
            <p style={{ fontSize: 14, color: '#4E5968', lineHeight: 1.7, marginBottom: 16 }}>
              {message || '사전을 불러오지 못했어요'}
            </p>
            <button
              onClick={onRetry}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#F2F4F6',
                color: '#191F28',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {status === 'done' && result && (
          <>
            {/* 번역 */}
            <section style={{ marginBottom: 22 }}>
              <p style={LABEL_STYLE}>{isKorean ? '영어로는' : '번역'}</p>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#191F28',
                  lineHeight: 1.75,
                  letterSpacing: '-0.3px',
                }}
              >
                {result.translation}
              </p>
              {result.literal && (
                <p style={{ fontSize: 13, color: '#8B95A1', lineHeight: 1.7, marginTop: 6 }}>
                  직역 · {result.literal}
                </p>
              )}
            </section>

            {/* 뜻 */}
            {showSenses && (
            <section style={{ marginBottom: result.note || result.synonyms?.length ? 22 : 4 }}>
              <p style={LABEL_STYLE}>{result.kind === 'sentence' ? '끊어 읽기' : '뜻'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {result.senses.map((sense, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        backgroundColor: '#F2F4F6',
                        color: '#8B95A1',
                        fontSize: 11,
                        fontWeight: 700,
                        marginTop: 2,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, color: '#191F28', lineHeight: 1.7 }}>
                        {sense.pos && (
                          <span style={{ color: '#3182F6', fontWeight: 600, marginRight: 6 }}>
                            {sense.pos}
                          </span>
                        )}
                        {sense.meaningKr}
                      </p>
                      {sense.example && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: '10px 12px',
                            borderRadius: 10,
                            backgroundColor: '#F8F9FA',
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              color: '#4E5968',
                              lineHeight: 1.6,
                              fontStyle: 'italic',
                            }}
                          >
                            {sense.example}
                          </p>
                          {sense.exampleKr && (
                            <p
                              style={{
                                fontSize: 12,
                                color: '#8B95A1',
                                lineHeight: 1.6,
                                marginTop: 4,
                              }}
                            >
                              {sense.exampleKr}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            {/* 학습 포인트 */}
            {result.note && (
              <section style={{ marginBottom: result.synonyms?.length ? 22 : 4 }}>
                <div
                  style={{
                    padding: '13px 14px',
                    borderRadius: 12,
                    backgroundColor: '#FFF8E7',
                    borderLeft: '3px solid #FFB020',
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#B07400',
                      letterSpacing: '0.04em',
                      marginBottom: 5,
                    }}
                  >
                    💡 이건 알아 두면 좋아요
                  </p>
                  <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.7 }}>{result.note}</p>
                </div>
              </section>
            )}

            {/* 유의어 */}
            {result.synonyms && result.synonyms.length > 0 && (
              <section>
                <p style={LABEL_STYLE}>비슷한 표현</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {result.synonyms.map(word => (
                    <span
                      key={word}
                      style={{
                        padding: '6px 11px',
                        borderRadius: 9,
                        backgroundColor: '#F8F9FA',
                        border: '1px solid #F2F4F6',
                        fontSize: 13,
                        color: '#4E5968',
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {state.source === 'glossary' && (
              <button
                onClick={onExpand}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: '11px 0',
                  borderRadius: 12,
                  border: '1px solid #E5E8EB',
                  backgroundColor: '#FFFFFF',
                  color: '#4E5968',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '-0.2px',
                  cursor: 'pointer',
                }}
              >
                예문 · 유의어까지 자세히 보기
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 저장 ── */}
      {status === 'done' && result && (
        <div
          style={{
            borderTop: '1px solid #F2F4F6',
            padding: '12px 20px calc(16px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={onSave}
            disabled={saved}
            style={{
              width: '100%',
              padding: '14px 0',
              borderRadius: 14,
              border: 'none',
              backgroundColor: saved ? '#F2F4F6' : '#3182F6',
              color: saved ? '#8B95A1' : '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.3px',
              cursor: saved ? 'default' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {saved ? '✓ 단어장에 저장했어요' : '⭐ 단어장에 저장'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

function LoadingBody() {
  return (
    <div>
      <style>{`
        @keyframes lookupPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
      <p style={{ fontSize: 13, color: '#8B95A1', marginBottom: 16 }}>사전에서 찾는 중이에요…</p>
      {[100, 82, 92, 64].map((width, i) => (
        <div
          key={i}
          style={{
            height: 13,
            width: `${width}%`,
            borderRadius: 7,
            backgroundColor: '#F2F4F6',
            marginBottom: 11,
            animation: 'lookupPulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}
