const maxTextLength = 8000

export async function readWebPage(url) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('只支持 http 或 https 网页链接。')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`网页读取失败，状态码 ${response.status}。`)
    }

    const html = await response.text()
    const title = pickFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
    const description =
      pickFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      pickFirst(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    const text = htmlToText(html).slice(0, maxTextLength)

    if (text.length < 80) {
      throw new Error('这个链接公开文本太少，请改用粘贴文案分析。')
    }

    return {
      url: parsed.href,
      host: parsed.host,
      title: decodeHtml(title || parsed.host),
      description: decodeHtml(description || ''),
      text,
      platform: detectPlatform(parsed.host),
    }
  } finally {
    clearTimeout(timer)
  }
}

function detectPlatform(host) {
  if (host.includes('bilibili.com') || host.includes('b23.tv')) return 'B站'
  if (host.includes('douyin.com')) return '抖音'
  return '网页'
}

function pickFirst(html, pattern) {
  return html.match(pattern)?.[1]?.trim()
}

function htmlToText(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
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
