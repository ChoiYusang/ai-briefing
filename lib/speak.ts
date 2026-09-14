'use client'

// 브라우저 내장 TTS로 발음을 들려준다. 지원하지 않는 환경에서는 조용히 무시.
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang: 'en-US' | 'ko-KR' = 'en-US') {
  if (!canSpeak()) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  } catch {
    // 일부 브라우저에서 사용자 제스처 없이 호출하면 실패한다 — 무시
  }
}
