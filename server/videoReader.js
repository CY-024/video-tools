const minTranscriptLength = 30

const browserHeaders = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
  Referer: 'https://www.bilibili.com/',
}

export async function readVideoTranscript(url) {
  const finalUrl = await resolveUrl(url)
  const parsed = new URL(finalUrl)

  if (isBilibiliHost(parsed.host)) {
    return readBilibiliTranscript(parsed)
  }

  if (isDouyinHost(parsed.host)) {
    return readDouyinTranscript(parsed)
  }

  const error = new Error(
    '这个视频平台暂时不能直接提取解说文案。当前支持 B站公开视频字幕，并会尝试读取抖音公开字幕/口播文本；没有字幕的视频需要后续接入语音转文字服务。',
  )
  error.status = 422
  throw error
}

async function resolveUrl(url) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const error = new Error('只支持 http 或 https 视频链接。')
    error.status = 400
    throw error
  }

  if (!parsed.host.includes('b23.tv') && !parsed.host.includes('v.douyin.com')) {
    return parsed.href
  }

  const headResponse = await fetch(parsed.href, {
    method: 'HEAD',
    redirect: 'follow',
    headers: browserHeaders,
  }).catch(() => null)
  if (headResponse?.url) return headResponse.url

  const getResponse = await fetch(parsed.href, {
    redirect: 'follow',
    headers: browserHeaders,
  })
  return getResponse.url || parsed.href
}

async function readBilibiliTranscript(parsed) {
  const bvid = extractBvid(parsed.href)
  if (!bvid) {
    const error = new Error('没有从这个 B站 链接里识别到 BV 号，请换成完整的视频页链接。')
    error.status = 400
    throw error
  }

  const view = await getJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`)
  const pages = view?.data?.pages || []
  const cid = pages[0]?.cid
  if (!cid) {
    const error = new Error('没有读取到这个 B站 视频的分 P 信息，暂时无法提取字幕。')
    error.status = 422
    throw error
  }

  const player = await getJson(`https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`)
  const subtitles = player?.data?.subtitle?.subtitles || []
  const subtitle = pickSubtitle(subtitles)

  if (!subtitle?.subtitle_url) {
    const error = new Error(
      '这个 B站 视频没有公开字幕，所以暂时提取不到内部解说文案。可以换一个带字幕的视频，或先把文案粘贴进来分析。',
    )
    error.status = 422
    throw error
  }

  const subtitleUrl = normalizeSubtitleUrl(subtitle.subtitle_url)
  const subtitlePayload = await getJson(subtitleUrl)
  const segments = normalizeSubtitleSegments(subtitlePayload?.body || [])
  const text = segments.map((item) => item.content).join('\n')

  if (text.replace(/\s/g, '').length < minTranscriptLength) {
    const error = new Error('字幕内容太少，暂时无法作为解说文案分析。')
    error.status = 422
    throw error
  }

  return {
    url: parsed.href,
    title: view?.data?.title || bvid,
    platform: 'B站视频字幕',
    source: subtitle.lan_doc || subtitle.lan || '公开字幕',
    text,
    segments,
  }
}

async function readDouyinTranscript(parsed) {
  const html = await getText(parsed.href)
  const title =
    decodeHtml(pickFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)) ||
    decodeHtml(pickFirst(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)) ||
    '抖音视频'
  const description =
    decodeHtml(pickFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)) ||
    decodeHtml(pickFirst(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i))

  const publicData = extractDouyinPublicData(html)
  const transcript = pickBestTranscript(publicData)

  if (transcript.replace(/\s/g, '').length < minTranscriptLength) {
    const hint = [title, description].filter(Boolean).join(' / ').slice(0, 120)
    const error = new Error(
      `已经识别到这是抖音链接，但没有读到公开字幕或口播文本。${hint ? `页面只公开了：${hint}` : '这个视频可能需要登录、被反爬，或本身没有公开字幕。'} 可以换带字幕的视频，或先粘贴文案分析。`,
    )
    error.status = 422
    throw error
  }

  return {
    url: parsed.href,
    title,
    platform: '抖音视频字幕',
    source: '抖音公开字幕/口播文本',
    text: transcript,
    segments: transcript.split('\n').map((content) => ({ from: 0, to: 0, content })),
  }
}

function isBilibiliHost(host) {
  return host.includes('bilibili.com') || host.includes('b23.tv')
}

function isDouyinHost(host) {
  return host.includes('douyin.com')
}

function extractBvid(value) {
  return value.match(/BV[a-zA-Z0-9]{10}/)?.[0]
}

function pickSubtitle(subtitles) {
  return (
    subtitles.find((item) => item.lan?.includes('zh')) ||
    subtitles.find((item) => item.lan_doc?.includes('中文')) ||
    subtitles[0]
  )
}

function normalizeSubtitleUrl(value) {
  if (value.startsWith('//')) return `https:${value}`
  if (value.startsWith('http')) return value
  return `https://www.bilibili.com${value}`
}

function normalizeSubtitleSegments(segments) {
  return segments
    .map((item) => ({
      from: Number(item.from || 0),
      to: Number(item.to || 0),
      content: String(item.content || '').trim(),
    }))
    .filter((item) => item.content)
}

async function getJson(url) {
  const response = await fetch(url, { headers: browserHeaders })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload) {
    const error = new Error(`视频信息读取失败，状态码 ${response.status}。`)
    error.status = response.status || 502
    throw error
  }

  if (typeof payload.code === 'number' && payload.code !== 0) {
    const error = new Error(payload.message || '平台接口没有返回可用的视频信息。')
    error.status = 422
    throw error
  }

  return payload
}

async function getText(url) {
  const response = await fetch(url, { headers: browserHeaders })
  if (!response.ok) {
    const error = new Error(`视频页面读取失败，状态码 ${response.status}。`)
    error.status = response.status || 502
    throw error
  }
  return response.text()
}

function extractDouyinPublicData(html) {
  const values = []
  const renderData = pickFirst(
    html,
    /<script[^>]+id=["']RENDER_DATA["'][^>]*>([\s\S]*?)<\/script>/i,
  )

  if (renderData) {
    try {
      collectTranscriptLikeText(JSON.parse(decodeURIComponent(renderData)), values)
    } catch {
      // Douyin changes page data often; regex fallbacks below keep this best-effort.
    }
  }

  for (const pattern of [
    /"caption(?:_text|Text)?"\s*:\s*"([^"]{20,})"/gi,
    /"subtitle(?:_text|Text)?"\s*:\s*"([^"]{20,})"/gi,
    /"voice(?:_text|Text)?"\s*:\s*"([^"]{20,})"/gi,
    /"asr(?:_text|Text)?"\s*:\s*"([^"]{20,})"/gi,
    /"desc"\s*:\s*"([^"]{20,})"/gi,
  ]) {
    for (const match of html.matchAll(pattern)) {
      values.push(cleanJsonString(match[1]))
    }
  }

  return values
}

function collectTranscriptLikeText(value, values, key = '') {
  if (!value) return

  if (typeof value === 'string') {
    const lowerKey = key.toLowerCase()
    if (
      value.length >= 20 &&
      /(caption|subtitle|voice|asr|ocr|desc|text|content)/.test(lowerKey)
    ) {
      values.push(value)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTranscriptLikeText(item, values, key))
    return
  }

  if (typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      collectTranscriptLikeText(childValue, values, childKey)
    })
  }
}

function pickBestTranscript(values) {
  const cleaned = [...new Set(values.map(cleanJsonString))]
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter((item) => item.replace(/\s/g, '').length >= minTranscriptLength)
    .sort((a, b) => b.length - a.length)

  return cleaned[0] || ''
}

function pickFirst(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || ''
}

function cleanJsonString(value = '') {
  return decodeHtml(
    String(value)
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\u([\dA-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
  ).trim()
}

function decodeHtml(value = '') {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
