import 'dotenv/config'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { analyzeAndSave, generateWithLibrary } from './learningService.js'
import { transcribeVideoFile, uploadMaxBytes } from './mediaTranscriptionService.js'
import { deleteRecord, readRecords } from './storage.js'
import { readVideoTranscript } from './videoReader.js'
import { readWebPage } from './webReader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const uploadDir = path.resolve(__dirname, '..', 'data', 'uploads')

const app = express()
const port = Number(process.env.API_PORT || 8787)

fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: uploadMaxBytes() },
  fileFilter(_request, file, callback) {
    const isMp4 =
      file.mimetype === 'video/mp4' || path.extname(file.originalname).toLowerCase() === '.mp4'
    if (!isMp4) {
      callback(new Error('目前只支持上传 MP4 视频文件。'))
      return
    }
    callback(null, true)
  },
})

app.use((request, response, next) => {
  const allowedOrigins = new Set([
    `http://127.0.0.1:${port}`,
    'http://127.0.0.1:5173',
  ])
  const requestOrigin = request.headers.origin

  if (allowedOrigins.has(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin)
  }

  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: '4mb' }))
app.use(express.static(distDir))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, app: 'video-tools-workbench', apiVersion: 2 })
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

app.delete('/api/learn/records/:id', async (request, response, next) => {
  try {
    const result = await deleteRecord(request.params.id)
    response.json(result)
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
      throw httpError('请先粘贴网页链接。', 400)
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
      throw httpError('请先粘贴视频链接。', 400)
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

app.post('/api/learn/analyze-video-file', upload.single('video'), async (request, response, next) => {
  try {
    if (!request.file) {
      throw httpError('请先选择一个 MP4 视频文件。', 400)
    }

    const video = await transcribeVideoFile({
      filePath: request.file.path,
      originalName: request.file.originalname,
      title: request.body.title,
      platform: request.body.platform,
      cleanupInput: true,
    })

    response.json({
      video: {
        title: video.title,
        platform: video.platform,
        duration: video.duration,
        source: video.source,
        sourceUrl: video.sourceUrl,
      },
      transcript: video.transcript,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/learn/analyze-extracted-text', async (request, response, next) => {
  try {
    const { title, platform, text, sourceUrl, sourceType } = request.body
    const record = await analyzeAndSave({
      sourceType: sourceType || 'video-transcript',
      title,
      platform,
      text,
      url: sourceUrl,
    })
    response.json({ record })
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

app.use((request, response, next) => {
  if (request.method === 'GET' && request.accepts('html')) {
    response.sendFile(path.join(distDir, 'index.html'))
    return
  }

  next()
})

app.use((error, _request, response, _next) => {
  const status = error.status || error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
  const message =
    error.code === 'LIMIT_FILE_SIZE'
      ? `视频文件太大了，当前上限是 ${Math.round(uploadMaxBytes() / 1024 / 1024)}MB。可以压缩视频，或在 .env 里调高 UPLOAD_MAX_MB。`
      : error.message || '服务器出了点问题。'

  response.status(status).json({ message })
})

const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Video tools running at http://127.0.0.1:${port}`)
})

server.on('error', (error) => {
  console.error(error)
  process.exitCode = 1
})

function httpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}
