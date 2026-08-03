import type { RssItem } from './fetchNews'

// NAVER API HUB 뉴스 검색 (구 개발자센터 검색 API의 후속, 현재 무료 — 월 775,000회)
const NAVER_ENDPOINT = 'https://naverapihub.apigw.ntruss.com/search/v1/news'

// "AI" 단독 검색은 조류인플루엔자 기사까지 잡히므로 구체적인 검색어만 사용
const QUERIES = ['인공지능', '생성형 AI', '오픈AI', 'AI 모델']

const MAX_ITEMS = 15

// 지역 보도자료·홍보성 기사를 밀어내기 위해 주요 언론사를 우선 배치한다.
const MAJOR_PRESS: Record<string, string> = {
  'yna.co.kr': '연합뉴스',
  'yonhapnews.co.kr': '연합뉴스',
  'hankyung.com': '한국경제',
  'mk.co.kr': '매일경제',
  'sedaily.com': '서울경제',
  'etnews.com': '전자신문',
  'zdnet.co.kr': '지디넷코리아',
  'ddaily.co.kr': '디지털데일리',
  'dt.co.kr': '디지털타임스',
  'inews24.com': '아이뉴스24',
  'bloter.net': '블로터',
  'aitimes.com': 'AI타임스',
  'aitimes.kr': '인공지능신문',
  'chosun.com': '조선일보',
  'joongang.co.kr': '중앙일보',
  'donga.com': '동아일보',
  'hani.co.kr': '한겨레',
  'khan.co.kr': '경향신문',
  'mt.co.kr': '머니투데이',
  'edaily.co.kr': '이데일리',
  'news1.kr': '뉴스1',
  'newsis.com': '뉴시스',
  'kbs.co.kr': 'KBS',
  'sbs.co.kr': 'SBS',
  'imbc.com': 'MBC',
  'ytn.co.kr': 'YTN',
}

interface NaverNewsItem {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
}

// 검색어 매칭 <b> 태그 및 HTML 엔티티 제거
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function pressInfo(link: string): { name: string; isMajor: boolean } {
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, '')
    for (const [domain, name] of Object.entries(MAJOR_PRESS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return { name, isMajor: true }
      }
    }
    return { name: hostname, isMajor: false }
  } catch {
    return { name: '네이버 뉴스', isMajor: false }
  }
}

export async function fetchNaverNews(): Promise<RssItem[]> {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.warn('[fetchNaverNews] NAVER_CLIENT_ID/SECRET 미설정 — 네이버 뉴스 수집 건너뜀')
    return []
  }

  const cutoff = Date.now() - 28 * 60 * 60 * 1000 // RSS와 동일한 28h 버퍼
  const seen = new Set<string>()
  const collected: { item: RssItem; isMajor: boolean }[] = []

  const results = await Promise.allSettled(
    QUERIES.map(async query => {
      const url = `${NAVER_ENDPOINT}?query=${encodeURIComponent(query)}&display=30&sort=date&format=json`
      const res = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`)
      return res.json() as Promise<{ items?: NaverNewsItem[] }>
    })
  )

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[fetchNaverNews] Failed: "${QUERIES[i]}" — ${result.reason}`)
      return
    }

    for (const raw of result.value.items ?? []) {
      const pubDate = new Date(raw.pubDate)
      if (isNaN(pubDate.getTime()) || pubDate.getTime() < cutoff) continue

      const title = stripHtml(raw.title)
      if (!title || seen.has(title.toLowerCase())) continue
      seen.add(title.toLowerCase())

      const link = raw.originallink || raw.link
      if (!link) continue

      const { name, isMajor } = pressInfo(link)
      collected.push({
        isMajor,
        item: {
          title,
          link,
          pubDate: raw.pubDate,
          description: stripHtml(raw.description),
          imageUrl: undefined, // 네이버 검색 API는 이미지를 제공하지 않음
          source: name,
        },
      })
    }
  })

  collected.sort((a, b) => {
    if (a.isMajor !== b.isMajor) return a.isMajor ? -1 : 1
    return new Date(b.item.pubDate).getTime() - new Date(a.item.pubDate).getTime()
  })

  const items = collected.slice(0, MAX_ITEMS).map(c => c.item)
  console.log(
    `[fetchNaverNews] Collected ${collected.length} items (major: ${collected.filter(c => c.isMajor).length}) → returning ${items.length}`
  )
  return items
}
