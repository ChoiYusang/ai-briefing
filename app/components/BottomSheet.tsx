'use client'

import { useEffect } from 'react'

// 하단에서 올라오는 시트. data-study-ignore를 달아 두면 시트 안에서 텍스트를
// 선택해도 사전 조회가 다시 트리거되지 않는다.
export default function BottomSheet({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <style>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes sheetFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <div
        data-study-ignore
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 1000,
          animation: 'sheetFadeIn 0.15s ease',
        }}
      />

      <div
        data-study-ignore
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 576,
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'sheetSlideUp 0.24s cubic-bezier(0.32,0.72,0,1)',
            pointerEvents: 'auto',
            letterSpacing: '-0.3px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E8EB' }} />
          </div>
          {children}
        </div>
      </div>
    </>
  )
}
