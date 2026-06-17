import 'dotenv/config'
import express from 'express'
import { analyzeAndSave, generateWithLibrary } from './learningService.js'
import { readRecords } from './storage.js'
import { readVideoTranscript } from './videoReader.js'
import { readWebPage } from './webReader.js'

const app = express()
const port = Number(process.env.API_PORT || 8787)

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/learn/records', async (_request, response, next) => {
  try {
    response.json({ records: await readRecords() })
  } catch (error) {
    next(error)
  }
})

app.get('/api/learn/samples', async (_request, response, next) => {
  try {
    response.json({ samples: (await readRecords()).slice(0, 8) })
  } catch (error) {
    next(error)
  }
})

app.post('/api/learn/analyze-text', async (request, response, next) => {
  try {
    const { title, platform, text } = request.body
    const record = await analyzeAndSave({
      sourceType: 'text',
      title,
      platform,
      text,
    })
    response.json({ record })
  } catch (error) {
    next(error)
  }
})

app.post('/api/learn/analyze-url', async (request, response, next) => {
  try {
    const { url } = request.body
    if (!url) {
      const error = new Error('请先粘贴网页链接。')
      error.status = 400
      throw error
    }

    const page = await readWebPage(url)
    const record = await analyzeAndSave({
      sourceType: 'url',
      title: page.title,
      platform: page.platform,
      text: [page.title, page.description, page.text].filter(Boolean).join('\n'),
      url: page.url,
    })
    response.json({ page, record })
  } catch (error) {
    next(error)
  }
})

app.post('/api/learn/analyze-video-url', async (request, response, next) => {
  try {
    const { url } = request.body
    if (!url) {
      const error = new Error('请先粘贴视频链接。')
      error.status = 400
      throw error
    }

    const video = await readVideoTranscript(url)
    const record = await analyzeAndSave({
      sourceType: 'video-url',
      title: video.title,
      platform: video.platform,
      text: video.text,
      url: video.url,
    })
    response.json({ video, record })
  } catch (error) {
    next(error)
  }
})

app.post('/api/write/generate', async (request, response, next) => {
  try {
    const result = await generateWithLibrary({ requirement: request.body.requirement })
    response.json(result)
  } catch (error) {
    next(error)
  }
})

app.use((error, _request, response, _next) => {
  const status = error.status || error.statusCode || 500
  response.status(status).json({
    message: error.message || '服务器出了点问题。',
  })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`API server running at http://127.0.0.1:${port}`)
})
