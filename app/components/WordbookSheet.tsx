'use client'

import { useState } from 'react'
import { WordbookEntry } from '@/lib/types'
import { canSpeak, speak } from '@/lib/speak'
import BottomSheet from './BottomSheet'

export default function WordbookSheet({
  open,
  entries,
  onRemove,
  onClear,
  onClose,
}: {
  open: boolean
  entries: WordbookEntry[]
  onRemove: (id: string) => void
  onClear: () => void
  onClose: () => void
}) {
  // 복습 모드: 뜻을 가려 두고 눌러서 확인한다
  const [quiz, setQuiz] = useState(false)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  // 전체 삭제는 한 번 더 눌러야 실행된다 (실수 방지)
  const [confirmClear, setConfirmClear] = useState(false)

  const toggleQuiz = () => {
    setQuiz(!quiz)
    setRevealed({})
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      {/* ── 헤더 ── */}
      <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid #F2F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 19, fontWeight: 700, color: '#191F28', letterSpacing: '-0.5px' }}>
              내 단어장
            </p>
            <p style={{ fontSize: 12, color: '#8B95A1', marginTop: 3 }}>
              {entries.length > 0
                ? `${entries.length}개 저장됨 · 이 기기에만 보관돼요`
                : '이 기기에만 보관돼요'}
            </p>
          </div>

          {entries.length > 0 && (
            <button
              onClick={toggleQuiz}
              style={{
                flexShrink: 0,
                padding: '7px 12px',
                borderRadius: 10,
                border: `1px solid ${quiz ? '#3182F6' : '#E5E8EB'}`,
                backgroundColor: quiz ? '#EFF6FF' : '#FFFFFF',
                color: quiz ? '#3182F6' : '#4E5968',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {quiz ? '뜻 보이기' : '뜻 가리기'}
            </button>
          )}

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

      {/* ── 목록 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: entries.length ? '8px 20px 16px' : '0' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '48px 24px 56px', textAlign: 'center' }}>
            <p style={{ fontSize: 36, marginBottom: 14 }}>📒</p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#191F28',
                marginBottom: 6,
                letterSpacing: '-0.3px',
              }}
            >
              아직 저장한 표현이 없어요
            </p>
            <p style={{ fontSize: 13, color: '#8B95A1', lineHeight: 1.7 }}>
              기사에서 단어나 문장을 드래그한 뒤
              <br />
              ⭐ 버튼을 누르면 여기에 쌓여요
            </p>
          </div>
        ) : (
          entries.map(entry => {
            const hidden = quiz && !revealed[entry.id]
            return (
              <div
                key={entry.id}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid #F8F9FA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#191F28',
                        lineHeight: 1.5,
                        letterSpacing: '-0.3px',
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry.query}
                    </p>
                    {entry.pronunciation && (
                      <p style={{ fontSize: 12, color: '#B0B8C1', marginTop: 2, letterSpacing: 0 }}>
                        {entry.pronunciation}
                      </p>
                    )}
                  </div>

                  {canSpeak() && (
                    <button
                      onClick={() =>
                        speak(entry.direction === 'ko-en' ? entry.translation : entry.query)
                      }
                      aria-label="발음 듣기"
                      style={{
                        flexShrink: 0,
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        border: 'none',
                        backgroundColor: '#F8F9FA',
                        fontSize: 13,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      🔊
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(entry.id)}
                    aria-label="삭제"
                    style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      border: 'none',
                      backgroundColor: '#F8F9FA',
                      color: '#B0B8C1',
                      fontSize: 13,
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <button
                  onClick={() => hidden && setRevealed({ ...revealed, [entry.id]: true })}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 7,
                    padding: 0,
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: hidden ? 'pointer' : 'default',
                  }}
                >
                  {hidden ? (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '5px 12px',
                        borderRadius: 8,
                        backgroundColor: '#F2F4F6',
                        color: '#B0B8C1',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      눌러서 뜻 확인
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14,
                          color: '#3182F6',
                          fontWeight: 600,
                          lineHeight: 1.6,
                        }}
                      >
                        {entry.translation}
                      </span>
                      {entry.meaningKr !== entry.translation && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 13,
                            color: '#6B7684',
                            lineHeight: 1.65,
                            marginTop: 3,
                          }}
                        >
                          {entry.meaningKr}
                        </span>
                      )}
                      {entry.example && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 12,
                            color: '#8B95A1',
                            lineHeight: 1.6,
                            marginTop: 5,
                            fontStyle: 'italic',
                          }}
                        >
                          {entry.example}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── 전체 삭제 ── */}
      {entries.length > 0 && (
        <div
          style={{
            borderTop: '1px solid #F2F4F6',
            padding: '10px 20px calc(14px + env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true)
                return
              }
              setConfirmClear(false)
              onClear()
            }}
            onBlur={() => setConfirmClear(false)}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              border: 'none',
              backgroundColor: confirmClear ? '#FEE9EC' : '#F8F9FA',
              color: confirmClear ? '#E5405E' : '#8B95A1',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {confirmClear ? '한 번 더 누르면 모두 지워져요' : '단어장 전체 비우기'}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
