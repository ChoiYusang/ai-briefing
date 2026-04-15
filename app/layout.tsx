import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 데일리 브리핑',
  description: '매일 아침 AI 핵심 뉴스를 한눈에',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
