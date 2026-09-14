'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GlossaryIndex, loadGlossary, matchGlossary } from '@/lib/glossaryClient'
import { detectDirection, isLookupWorthy, lookupKey, MAX_QUERY_LENGTH } from '@/lib/lookupShared'
import { LookupResult, WordbookEntry } from '@/lib/types'
import {
  clearWordbook,
  loadWordbook,
  readCachedLookup,
  removeFromWordbook,
  saveToWordbook,
  writeCachedLookup,
} from '@/lib/wordbook'
import LookupSheet, { LookupState } from './LookupSheet'
import WordbookSheet from './WordbookSheet'

// 미리 만들어 둔 사전에 없어서 Gemini를 불러야 할 때만 이만큼 기다린다.
// (스크롤 중 스치는 선택으로 API를 때리지 않으려는 장치라, 공짜인 사전 히트에는 쓰지 않는다)
const SELECTION_DEBOUNCE = 180
const MAX_CONTEXT = 800

const CLOSED: LookupState = {
  open: false,
  query: '',
  status: 'loading',
  result: null,
  message: '',
  source: 'api',
}

// 앞뒤에 딸려 온 따옴표·마침표 같은 기호를 떼어낸다.
// 문장(7단어 이상)은 물음표·마침표가 뜻에 영향을 주므로 뒤쪽을 건드리지 않는다.
function normalizeSelection(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  const stripLeading = (s: string) => s.replace(/^[^\p{L}\p{N}]+/u, '')
  if (collapsed.split(' ').length > 6) return stripLeading(collapsed)
  return stripLeading(collapsed).replace(/[^\p{L}\p{N}%]+$/u, '')
}

function elementOf(node: Node | null): HTMLElement | null {
  if (!node) return null
  return node.nodeType === 1 ? (node as HTMLElement) : node.parentElement
}

// 본문(data-study-area) 안에서 고른 선택만 조회한다. 시트 안에서 고른 건 무시.
function withinStudyArea(node: Node | null): boolean {
  const el = elementOf(node)
  if (!el) return false
  if (el.closest('[data-study-ignore]')) return false
  return !!el.closest('[data-study-area]')
}

// 긁은 표현이 들어 있던 문단 전체 — 뜻을 문맥에 맞게 고르게 하는 핵심 재료
function contextOf(node: Node | null): string {
  const el = elementOf(node)
  const block = el?.closest('[data-study-text]') ?? el?.closest('[data-study-area]')
  return (block?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTEXT)
}

export default function StudyLookup({
  enabled,
  briefingDate,
}: {
  enabled: boolean
  briefingDate?: string
}) {
  const [state, setState] = useState<LookupState>(CLOSED)
  const [entries, setEntries] = useState<WordbookEntry[]>([])
  const [wordbookOpen, setWordbookOpen] = useState(false)
  const glossary = useRef<GlossaryIndex | null>(null)
  const glossaryLoading = useRef<Promise<GlossaryIndex | null> | null>(null)
  const requestId = useRef(0)
  const lastContext = useRef('')

  useEffect(() => {
    setEntries(loadWordbook())
  }, [])

  // 오늘치 사전을 미리 받아 둔다 — 단어 조회가 네트워크 없이 즉시 뜨는 근거
  useEffect(() => {
    if (!enabled || glossary.current) return
    let cancelled = false
    const pending = loadGlossary(briefingDate).then(index => {
      if (!cancelled && index) glossary.current = index
      return index
    })
    glossaryLoading.current = pending
    return () => {
      cancelled = true
    }
  }, [enabled, briefingDate])

  const runLookup = useCallback(async (query: string, context: string, force = false) => {
    const direction = detectDirection(query)

    // 1차 — 미리 만들어 둔 오늘치 사전. (동기 히트는 이미 호출부에서 걸러졌고,
    // 여기 오는 건 사전을 아직 받는 중이던 경우다. 잠깐 기다렸다 다시 맞춰 본다.)
    if (!force) {
      if (!glossary.current && glossaryLoading.current) {
        await glossaryLoading.current.catch(() => null)
      }
      const local = matchGlossary(glossary.current, query)
      if (local) {
        requestId.current += 1
        setState({ open: true, query, status: 'done', result: local, message: '', source: 'glossary' })
        return
      }

      // 2차 — 전에 찾아본 표현
      const cached = readCachedLookup(query, direction)
      if (cached) {
        requestId.current += 1
        setState({ open: true, query, status: 'done', result: cached, message: '', source: 'api' })
        return
      }
    }

    const id = ++requestId.current
    setState({ open: true, query, status: 'loading', result: null, message: '', source: 'api' })

    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, context }),
      })
      const data = await res.json().catch(() => null)
      if (id !== requestId.current) return // 그 사이에 다른 표현을 긁었으면 버린다

      if (!res.ok || !data?.translation) {
        setState(s => ({
          ...s,
          status: 'error',
          message: data?.error || '사전을 불러오지 못했어요',
        }))
        return
      }

      writeCachedLookup(data as LookupResult)
      setState({
        open: true,
        query,
        status: 'done',
        result: data as LookupResult,
        message: '',
        source: 'api',
      })
    } catch {
      if (id !== requestId.current) return
      setState(s => ({
        ...s,
        status: 'error',
        message: '인터넷 연결을 확인해 주세요. 저장한 단어장은 오프라인에서도 볼 수 있어요',
      }))
    }
  }, [])

  // ── 드래그(선택) 감지 ──
  useEffect(() => {
    if (!enabled) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const handle = () => {
      if (timer) clearTimeout(timer)

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const query = normalizeSelection(selection.toString())
      if (!isLookupWorthy(query) || selection.toString().trim().length > MAX_QUERY_LENGTH) return
      if (!withinStudyArea(selection.anchorNode)) return

      const context = contextOf(selection.anchorNode)
      lastContext.current = context

      // 사전에 이미 있으면 네트워크도 비용도 없으니 기다릴 이유가 없다 — 바로 띄운다
      const instant = matchGlossary(glossary.current, query)
      if (instant) {
        requestId.current += 1
        setState({ open: true, query, status: 'done', result: instant, message: '', source: 'glossary' })
        return
      }

      // Gemini를 불러야 하는 경우만 잠깐 기다렸다 보낸다
      timer = setTimeout(() => runLookup(query, context), SELECTION_DEBOUNCE)
    }

    document.addEventListener('mouseup', handle)
    document.addEventListener('touchend', handle)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('mouseup', handle)
      document.removeEventListener('touchend', handle)
    }
  }, [enabled, runLookup])

  const closeSheet = useCallback(() => {
    requestId.current += 1 // 진행 중이던 조회 결과가 뒤늦게 덮어쓰지 않도록
    setState(CLOSED)
  }, [])

  const handleSave = () => {
    if (!state.result) return
    setEntries(saveToWordbook(state.result))
  }

  const savedId = state.result ? lookupKey(state.result.query, state.result.direction) : ''
  const alreadySaved = !!savedId && entries.some(e => e.id === savedId)

  if (!enabled) return null

  return (
    <>
      <LookupSheet
        state={state}
        saved={alreadySaved}
        onSave={handleSave}
        onRetry={() => runLookup(state.query, lastContext.current, true)}
        onExpand={() => runLookup(state.query, lastContext.current, true)}
        onClose={closeSheet}
      />

      <WordbookSheet
        open={wordbookOpen}
        entries={entries}
        onRemove={id => setEntries(removeFromWordbook(id))}
        onClear={() => setEntries(clearWordbook())}
        onClose={() => setWordbookOpen(false)}
      />

      {/* 단어장 열기 버튼 */}
      <button
        data-study-ignore
        onClick={() => setWordbookOpen(true)}
        aria-label="내 단어장 열기"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 'calc(18px + env(safe-area-inset-bottom))',
          zIndex: 480,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: entries.length ? '11px 15px 11px 13px' : 12,
          borderRadius: 999,
          border: 'none',
          backgroundColor: '#191F28',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '-0.2px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>📒</span>
        {entries.length > 0 && <span>{entries.length}</span>}
      </button>
    </>
  )
}
