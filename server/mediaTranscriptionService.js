import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const uploadsDir = path.join(dataDir, 'uploads')
const tmpDir = path.join(dataDir, 'tmp')
const toolsDir = path.join(dataDir, 'tools')
const ffmpegDir = path.join(toolsDir, 'ffmpeg')
const localWhisperDepsDir = path.join(toolsDir, 'whisper-python')
const localWhisperScriptPath = path.join(__dirname, 'localWhisperTranscribe.py')
const bundledPythonPath = 'C:\\Users\\Crane\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
const ffmpegZipPath = path.join(toolsDir, 'ffmpeg-release-essentials.zip')
const ffmpegDownloadUrl =
  process.env.FFMPEG_DOWNLOAD_URL ||
  'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'

const minTranscriptLength = 30

export function uploadMaxBytes() {
  const megabytes = Number(process.env.UPLOAD_MAX_MB || 300)
  return Math.max(1, megabytes) * 1024 * 1024
}

export async function transcribeVideoFile({
  filePath,
  originalName,
  title,
  platform,
  cleanupInput = false,
}) {
  const jobId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const audioPath = path.join(tmpDir, `${jobId}.wav`)
  const outputDir = path.join(tmpDir, jobId)

  await fs.mkdir(outputDir, { recursive: true })

  try {
    const tools = await ensureFfmpegTools()
    const duration = await readVideoDuration({ ffprobePath: tools.ffprobePath, filePath })

    await runCommand(tools.ffmpegPath, [
      '-y',
      '-i',
      filePath,
      '-vn',
      '-acodec',
      'pcm_s16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      audioPath,
    ])

    const transcript = await transcribeAudioWithWhisper({ audioPath, outputDir })

    if (transcript.text.replace(/\s/g, '').length < minTranscriptLength) {
      throw httpError('没有识别到足够文案内容。可以换一个人声更清晰的视频，或先用“粘贴文案”分析。', 422)
    }

    return {
      title: title?.trim() || stripExtension(originalName) || '本地视频解说',
      platform: platform?.trim() || '本地 MP4 视频',
      duration,
      source: transcript.source,
      sourceUrl: `local:${originalName}`,
      transcript,
    }
  } finally {
    if (cleanupInput && isInsideDir(filePath, uploadsDir)) {
      await removeIfExists(filePath)
    }
    await removeIfExists(audioPath)
    await removeIfExists(outputDir)
  }
}

async function ensureFfmpegTools() {
  const configured = await findConfiguredFfmpeg()
  if (configured) return configured

  const fromPath = await findFfmpegInPath()
  if (fromPath) return fromPath

  return downloadFfmpegTools()
}

async function findConfiguredFfmpeg() {
  if (!process.env.FFMPEG_PATH || !process.env.FFPROBE_PATH) return null
  if (!(await fileExists(process.env.FFMPEG_PATH)) || !(await fileExists(process.env.FFPROBE_PATH))) {
    throw httpError('FFMPEG_PATH 或 FFPROBE_PATH 指向的文件不存在，请检查 .env 配置。', 500)
  }
  return {
    ffmpegPath: process.env.FFMPEG_PATH,
    ffprobePath: process.env.FFPROBE_PATH,
  }
}

async function findFfmpegInPath() {
  const ffmpegName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'
  const ffprobeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'

  try {
    await runCommand(ffmpegName, ['-version'])
    await runCommand(ffprobeName, ['-version'])
    return { ffmpegPath: ffmpegName, ffprobePath: ffprobeName }
  } catch {
    return null
  }
}

async function downloadFfmpegTools() {
  if (process.platform !== 'win32') {
    throw httpError('没有找到 ffmpeg/ffprobe。自动下载目前只支持 Windows，请先安装 ffmpeg，或在 .env 里配置 FFMPEG_PATH 和 FFPROBE_PATH。', 500)
  }

  const existing = await findBundledFfmpeg()
  if (existing) return existing

  await fs.mkdir(toolsDir, { recursive: true })
  await fs.mkdir(ffmpegDir, { recursive: true })

  try {
    await downloadFile(ffmpegDownloadUrl, ffmpegZipPath)
  } catch (error) {
    throw httpError(`自动下载 ffmpeg 失败：${error.message}。请检查网络，或手动下载后配置 FFMPEG_PATH 和 FFPROBE_PATH。`, 502)
  }

  try {
    await runCommand('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Expand-Archive -LiteralPath '${escapePowerShellPath(ffmpegZipPath)}' -DestinationPath '${escapePowerShellPath(ffmpegDir)}' -Force`,
    ])
  } catch (error) {
    throw httpError(`ffmpeg 已下载，但解压失败：${error.message}`, 500)
  }

  const bundled = await findBundledFfmpeg()
  if (!bundled) {
    throw httpError('ffmpeg 已下载，但没有在压缩包里找到 ffmpeg.exe 和 ffprobe.exe。', 500)
  }

  return bundled
}

async function downloadFile(url, outputPath) {
  try {
    await downloadFileWithFetch(url, outputPath)
  } catch (error) {
    await downloadFileWithCurl(url, outputPath).catch(async (curlError) => {
      await downloadFileWithPowerShell(url, outputPath).catch((fallbackError) => {
        throw new Error(`${error.message}；curl 备用下载也失败：${curlError.message}；PowerShell 备用下载也失败：${fallbackError.message}`)
      })
    })
  }
}

async function downloadFileWithFetch(url, outputPath) {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok || !response.body) {
    throw new Error(`下载状态码 ${response.status}`)
  }
  await new Promise((resolve, reject) => {
    const file = fsSync.createWriteStream(outputPath)
    file.on('finish', resolve)
    file.on('error', reject)
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          file.write(Buffer.from(chunk))
        },
        close() {
          file.end()
        },
        abort(reason) {
          file.destroy(reason)
        },
      }),
    ).catch(reject)
  })
}

async function downloadFileWithPowerShell(url, outputPath) {
  await runCommand('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '${escapePowerShellPath(url)}' -OutFile '${escapePowerShellPath(outputPath)}'`,
  ], { timeoutMs: 30 * 60 * 1000 })
}

async function downloadFileWithCurl(url, outputPath) {
  await runCommand('curl.exe', [
    '--ssl-no-revoke',
    '-L',
    '-C',
    '-',
    '--retry',
    '10',
    '--retry-delay',
    '3',
    '--connect-timeout',
    '30',
    '-o',
    outputPath,
    url,
  ], { timeoutMs: 30 * 60 * 1000 })
}

async function findBundledFfmpeg() {
  const files = await listFiles(ffmpegDir).catch(() => [])
  const ffmpegPath = files.find((item) => path.basename(item).toLowerCase() === 'ffmpeg.exe')
  const ffprobePath = files.find((item) => path.basename(item).toLowerCase() === 'ffprobe.exe')
  return ffmpegPath && ffprobePath ? { ffmpegPath, ffprobePath } : null
}

async function readVideoDuration({ ffprobePath, filePath }) {
  const output = await runCommand(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ])
  const seconds = Number(output.stdout.trim())
  return Number.isFinite(seconds) ? Math.round(seconds) : null
}

async function transcribeAudioWithWhisper({ audioPath, outputDir }) {
  const whisperCommand = process.env.WHISPER_COMMAND || 'whisper'
  const model = process.env.WHISPER_MODEL || 'small'

  if (!process.env.WHISPER_COMMAND && (await canUseLocalFasterWhisper())) {
    return transcribeAudioWithLocalFasterWhisper({ audioPath, outputDir, model })
  }

  try {
    await runCommand(
      whisperCommand,
      [
        audioPath,
        '--model',
        model,
        '--language',
        'Chinese',
        '--task',
        'transcribe',
        '--output_format',
        'all',
        '--output_dir',
        outputDir,
      ],
      { shell: true, timeoutMs: 60 * 60 * 1000 },
    )
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? '已抽出音频，但没有找到本地 Whisper。请先安装语音转文字工具，并确认 WHISPER_COMMAND 可以运行。'
      : `已抽出音频，但 Whisper 转写失败：${error.message}`
    throw httpError(message, error.code === 'ENOENT' ? 500 : 502)
  }

  const files = await listFiles(outputDir).catch(() => [])
  const textPath = files.find((item) => path.extname(item).toLowerCase() === '.txt')
  const srtPath = files.find((item) => path.extname(item).toLowerCase() === '.srt')
  const text = textPath ? await fs.readFile(textPath, 'utf8').catch(() => '') : ''
  const srt = srtPath ? await fs.readFile(srtPath, 'utf8').catch(() => '') : ''

  if (!text.trim() && !srt.trim()) {
    throw httpError('Whisper 没有生成可用的字幕或文本文件。', 502)
  }

  return {
    text: text.trim() || srtToText(srt),
    srt: srt.trim(),
    source: `本地 MP4 音频转写 · Whisper ${model}`,
  }
}

async function canUseLocalFasterWhisper() {
  return (await fileExists(localWhisperScriptPath)) && (await fileExists(localWhisperDepsDir))
}

async function transcribeAudioWithLocalFasterWhisper({ audioPath, outputDir, model }) {
  const pythonPath = await findPythonForLocalWhisper()

  try {
    await runCommand(
      pythonPath,
      [
        localWhisperScriptPath,
        '--audio',
        audioPath,
        '--output-dir',
        outputDir,
        '--model',
        model,
        '--language',
        'zh',
        '--device',
        process.env.WHISPER_DEVICE || 'cpu',
        '--compute-type',
        process.env.WHISPER_COMPUTE_TYPE || 'int8',
      ],
      {
        timeoutMs: 60 * 60 * 1000,
        env: {
          PYTHONPATH: localWhisperDepsDir,
          HF_HOME: path.join(toolsDir, 'huggingface'),
        },
      },
    )
  } catch (error) {
    throw httpError(`已抽出音频，但项目内 Whisper 转写失败：${error.message}`, 502)
  }

  const files = await listFiles(outputDir).catch(() => [])
  const textPath = files.find((item) => path.extname(item).toLowerCase() === '.txt')
  const srtPath = files.find((item) => path.extname(item).toLowerCase() === '.srt')
  const text = textPath ? await fs.readFile(textPath, 'utf8').catch(() => '') : ''
  const srt = srtPath ? await fs.readFile(srtPath, 'utf8').catch(() => '') : ''

  if (!text.trim() && !srt.trim()) {
    throw httpError('项目内 Whisper 没有生成可用的字幕或文本文件。', 502)
  }

  return {
    text: text.trim() || srtToText(srt),
    srt: srt.trim(),
    source: `本地 MP4 音频转写 · faster-whisper ${model}`,
  }
}

async function findPythonForLocalWhisper() {
  if (process.env.WHISPER_PYTHON && (await fileExists(process.env.WHISPER_PYTHON))) {
    return process.env.WHISPER_PYTHON
  }
  if (await fileExists(bundledPythonPath)) {
    return bundledPythonPath
  }
  return process.platform === 'win32' ? 'python.exe' : 'python'
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      shell: options.shell || false,
      env: {
        ...process.env,
        ...(options.env || {}),
      },
    })
    let stdout = ''
    let stderr = ''
    let settled = false

    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGTERM')
      reject(httpError('命令执行超时。', 504))
    }, options.timeoutMs || 5 * 60 * 1000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(httpError(stderr || stdout || `命令执行失败：${command}`, 500))
    })
  })
}

async function listFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name)
      return entry.isDirectory() ? listFiles(fullPath) : fullPath
    }),
  )
  return nested.flat()
}

async function fileExists(value) {
  return fs
    .access(value)
    .then(() => true)
    .catch(() => false)
}

async function removeIfExists(value) {
  if (!value) return
  await fs.rm(value, { force: true, recursive: true }).catch(() => {})
}

function stripExtension(value = '') {
  return path.basename(value, path.extname(value)).trim()
}

function srtToText(value = '') {
  return value
    .split('\n')
    .filter((line) => line.trim() && !/^\d+$/.test(line.trim()) && !line.includes('-->'))
    .join('\n')
    .trim()
}

function escapePowerShellPath(value) {
  return value.replace(/'/g, "''")
}

function isInsideDir(filePath, parentDir) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(filePath))
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
}

function httpError(message, status) {
  const error = new Error(message)
  error.status = status
  return error
}
