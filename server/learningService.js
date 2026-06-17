import { askArk, hasArkConfig } from './arkClient.js'
import { readRecords, saveRecord } from './storage.js'

const defaultSegments = [
  { label: '钩子', detail: '开头先抛出反常结果或强问题，让观众想知道原因。' },
  { label: '冲突', detail: '快速交代人物目标和阻碍，把故事压力立起来。' },
  { label: '反转', detail: '中段安排一次信息翻面，让观众重新理解前面的内容。' },
  { label: '互动', detail: '结尾留下判断题或争议点，方便评论区接话。' },
]

export async function analyzeAndSave({ sourceType, title, platform, text, url }) {
  const cleanText = normalizeText(text)
  if (cleanText.length < 30) {
    const error = new Error('文案内容太短，至少粘贴 30 个字以上。')
    error.status = 400
    throw error
  }

  const analysis = hasArkConfig()
    ? await analyzeWithArk({ title, platform, text: cleanText, url })
    : fallbackAnalysis({ title, platform, text: cleanText })

  const record = normalizeRecord({
    ...analysis,
    sourceType,
    sourceUrl: url || '',
    sourceTitle: title || analysis.sourceTitle || '未命名爆款样本',
    platform: platform || analysis.platform || '未知来源',
    originalPreview: cleanText.slice(0, 320),
    createdAt: new Date().toISOString(),
    modelStatus: hasArkConfig() ? '已调用火山引擎方舟模型' : '未配置方舟密钥，已用本地规则分析',
  })

  await saveRecord(record)
  return record
}

export async function generateWithLibrary({ requirement }) {
  const cleanRequirement = normalizeText(requirement)
  if (cleanRequirement.length < 10) {
    const error = new Error('创作需求太短，请至少写清楚题材、时长和风格。')
    error.status = 400
    throw error
  }

  const records = await readRecords()
  if (!records.length) {
    const error = new Error('学习库还是空的，请先到第一模块学习 1-2 条爆款文案。')
    error.status = 409
    throw error
  }

  const references = pickReferences(records, cleanRequirement)
  if (hasArkConfig()) {
    return generateWithArk(cleanRequirement, references)
  }

  return fallbackGenerate(cleanRequirement, references)
}

async function analyzeWithArk({ title, platform, text, url }) {
  return askArk(
    [
      {
        role: 'system',
        content:
          '你是短视频爆款解说文案分析师。只返回 JSON，不要 Markdown。重点提炼可复用写法，不能照抄原文。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: '拆解爆款文案逻辑，供后续模仿借鉴生成新文案。',
          requiredSchema: {
            sourceTitle: '标题',
            platform: '平台',
            hook: '爆款开头钩子',
            emotionCurve: '情绪推进方式',
            conflict: '冲突设置',
            reversal: '反转节奏',
            visualVoiceoverTips: '画面/口播配合建议',
            commentTrigger: '结尾评论引导',
            reusableTemplate: '可复用写法模板',
            segments: [{ label: '段落标签', detail: '拆解说明' }],
            tags: ['标签'],
            score: 88,
          },
          source: { title, platform, url },
          text,
        }),
      },
    ],
    { temperature: 0.35 },
  )
}

async function generateWithArk(requirement, references) {
  const result = await askArk(
    [
      {
        role: 'system',
        content:
          '你是自媒体电影解说文案策划。根据学习库里的爆款结构生成新文案，只借鉴结构和节奏，不复刻具体表达。只返回 JSON。',
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: '根据创作需求生成新的爆款解说文案。',
          requirement,
          references,
          requiredSchema: {
            title: '新文案标题',
            fullScript: '完整解说文案',
            paragraphs: ['分段文案'],
            srtDraft: 'SRT 字幕草稿',
            referenceSummary: ['参考了哪些爆款结构'],
          },
        }),
      },
    ],
    { temperature: 0.78 },
  )

  return {
    title: result.title || '爆款解说文案',
    fullScript: result.fullScript || '',
    paragraphs: Array.isArray(result.paragraphs) ? result.paragraphs : [],
    srtDraft: result.srtDraft || '',
    referenceSummary: Array.isArray(result.referenceSummary) ? result.referenceSummary : [],
    references: references.map((item) => ({
      id: item.id,
      title: item.sourceTitle,
      hook: item.hook,
    })),
    modelStatus: '已参考学习库并调用火山引擎方舟模型',
  }
}

function fallbackAnalysis({ title, platform, text }) {
  const sentences = text.split(/[。！？!?]/).map((item) => item.trim()).filter(Boolean)
  const first = sentences[0] || text.slice(0, 60)
  const middle = sentences[Math.floor(sentences.length / 2)] || '中段通过信息差制造悬念。'
  const last = sentences.at(-1) || '结尾留下讨论空间。'

  return {
    sourceTitle: title || '粘贴文案样本',
    platform: platform || '手动粘贴',
    hook: first.slice(0, 80),
    emotionCurve: '先用悬念抓人，再用压力推进，中段制造反转，结尾抛出讨论点。',
    conflict: middle.slice(0, 90),
    reversal: '把观众前半段形成的判断推翻一次，制造继续看下去的理由。',
    visualVoiceoverTips: '开头用强画面，中段用人物反应和关键道具，反转处配合停顿和特写。',
    commentTrigger: last.slice(0, 90),
    reusableTemplate: '反常结果开场 -> 人物困境 -> 信息差推进 -> 反转解释 -> 评论区问题。',
    segments: defaultSegments,
    tags: ['悬念开头', '冲突推进', '反转节奏', '评论引导'],
    score: 76,
  }
}

function fallbackGenerate(requirement, references) {
  const main = references[0]
  const paragraphs = [
    `如果只看开头，你可能会以为这只是一个普通故事。但真正厉害的地方，是它从第一秒就把问题埋好了：${requirement}`,
    `主角表面上是在解决眼前的麻烦，实际上每一步都在暴露更深的冲突。观众会跟着他一起判断，又不断发现自己判断错了。`,
    `中段要把节奏推快：先给一个看似合理的答案，再立刻用新线索推翻它。这样观众不会觉得是在听剧情简介，而是在参与推理。`,
    `结尾不要把话说死，留下一个能让评论区接住的问题：真正改变结局的，到底是主角的选择，还是一开始被忽略的那个细节？`,
  ]

  return {
    title: '基于学习库生成的解说文案',
    fullScript: paragraphs.join('\n\n'),
    paragraphs,
    srtDraft: paragraphs
      .map((line, index) => {
        const start = String(index * 8).padStart(2, '0')
        const end = String(index * 8 + 7).padStart(2, '0')
        return `${index + 1}\n00:00:${start},000 --> 00:00:${end},500\n${line}`
      })
      .join('\n\n'),
    referenceSummary: references.map((item) => `参考《${item.sourceTitle}》的${item.hook || item.reusableTemplate}`),
    references: references.map((item) => ({
      id: item.id,
      title: item.sourceTitle,
      hook: item.hook,
    })),
    modelStatus: main
      ? '未配置方舟密钥，已用学习库规则生成草稿'
      : '未配置方舟密钥，已用本地规则生成草稿',
  }
}

function pickReferences(records, requirement) {
  const words = new Set(requirement.split(/\s|，|。|、|：|:|；|;/).filter((item) => item.length >= 2))

  return records
    .map((record) => {
      const haystack = [
        record.sourceTitle,
        record.hook,
        record.conflict,
        record.reversal,
        ...(record.tags || []),
      ].join(' ')
      const score = [...words].reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0)
      return { record, score }
    })
    .sort((a, b) => b.score - a.score || new Date(b.record.createdAt) - new Date(a.record.createdAt))
    .slice(0, 5)
    .map((item) => item.record)
}

function normalizeRecord(record) {
  return {
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceTitle: record.sourceTitle || '未命名爆款样本',
    platform: record.platform || '未知来源',
    sourceType: record.sourceType || 'text',
    sourceUrl: record.sourceUrl || '',
    originalPreview: record.originalPreview || '',
    hook: record.hook || '',
    emotionCurve: record.emotionCurve || '',
    conflict: record.conflict || '',
    reversal: record.reversal || '',
    visualVoiceoverTips: record.visualVoiceoverTips || '',
    commentTrigger: record.commentTrigger || '',
    reusableTemplate: record.reusableTemplate || '',
    segments: Array.isArray(record.segments) && record.segments.length ? record.segments : defaultSegments,
    tags: Array.isArray(record.tags) ? record.tags : [],
    score: Number(record.score) || 70,
    modelStatus: record.modelStatus,
    createdAt: record.createdAt,
  }
}

function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim()
}
