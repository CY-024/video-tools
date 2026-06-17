import 'dotenv/config'

const defaultBaseUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'

export function hasArkConfig() {
  return Boolean(process.env.ARK_API_KEY && process.env.ARK_MODEL_ID)
}

export async function askArk(messages, options = {}) {
  if (!hasArkConfig()) {
    const error = new Error('方舟模型还没有配置 API Key 或模型 ID。')
    error.code = 'ARK_NOT_CONFIGURED'
    throw error
  }

  const response = await fetch(process.env.ARK_BASE_URL || defaultBaseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ARK_MODEL_ID,
      messages,
      temperature: options.temperature ?? 0.65,
      response_format: { type: 'json_object' },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || '方舟模型调用失败。'
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('方舟模型没有返回可用内容。')
  }

  return parseJsonObject(content)
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('模型返回内容不是 JSON。')
    return JSON.parse(match[0])
  }
}
