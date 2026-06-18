import React, { useEffect, useMemo, useState } from 'react'
import { Converter } from 'opencc-js'
import {
  AudioLines,
  BadgeCheck,
  BrainCircuit,
  Captions,
  Download,
  Film,
  FolderUp,
  Gauge,
  Link,
  MousePointer2,
  Play,
  Scissors,
  Search,
  Send,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react'

const modules = [
  { id: 'learn', name: '爆款文案学习', icon: BrainCircuit, status: '结构学习库' },
  { id: 'write', name: '文案生成', icon: Wand2, status: '参考爆款逻辑' },
  { id: 'voice', name: 'AI 配音', icon: AudioLines, status: '文案转配音' },
  { id: 'match', name: '分镜剪辑', icon: Scissors, status: '音频驱动画面' },
]

const demoScript =
  '如果你只看了开头，绝对猜不到这个男人接下来会主动走进危险。所有人都以为他是在逃命，可镜头一转，他其实早就知道出口在哪里。真正可怕的不是房间里的机关，而是他每一次选择都在把观众带进误区。等真相出现时，你才发现前面所有看似无用的细节，都是导演提前埋下的答案。你觉得他最后赢了吗？还是从一开始，他就被困在别人写好的剧本里？'

const fallbackScript = [
  '如果你只看了前十秒，一定会以为这个男人是在逃命。',
  '但镜头往后一拉才发现，他不是被困住，而是在主动把危险引出来。',
  '接下来三次反转连续出现，每一次都让观众重新判断谁才是真正的猎物。',
  '最后留下一个开放问题：当真相被剪开以后，我们看到的是证据，还是主角想让我们相信的谎言。',
]

const storyboardScenes = [
  {
    type: '悬念钩子',
    purpose: '先抓注意力',
    visual: '门缝光影、主角背影、房间压迫感',
    broll: '走廊空镜',
    reason: '承接开场的逃离感，用空走廊把危险继续往前推。',
    tone: '#53c7ff',
  },
  {
    type: '人物处境',
    purpose: '交代主角为什么要回去',
    visual: '人物回头、桌面线索、房间全景',
    broll: '道具特写',
    reason: '上一句在解释动机，停顿时用道具特写帮观众消化信息。',
    tone: '#ffcc66',
  },
  {
    type: '反转推进',
    purpose: '把普通追逃升级成心理博弈',
    visual: '监控画面、角色反应、追逐片段',
    broll: '监控画面',
    reason: '反转段需要让观众停半拍，监控画面能接住“重新判断”的情绪。',
    tone: '#7cf29a',
  },
  {
    type: '结尾讨论',
    purpose: '留下评论区话题',
    visual: '表情定格、空镜慢推、结尾暗场',
    broll: '表情定格',
    reason: '金句后保留一点余味，用人物表情把问题抛给观众。',
    tone: '#f48cff',
  },
]

const voiceModes = [
  {
    id: 'tts',
    name: '文本转语音',
    desc: '直接把第二模块文案转成配音，适合先快速出一版。',
  },
  {
    id: 'design',
    name: '音色设计',
    desc: '用文字描述声音，比如低沉、悬疑、电影解说感。',
  },
  {
    id: 'clone',
    name: '可控声音克隆',
    desc: '上传参考音频，同时还能控制语气和节奏。',
  },
  {
    id: 'ultimate',
    name: '极致克隆',
    desc: '上传参考音频和对应文本，更贴近原声音色。',
  },
]

const pauseDecisionMeta = {
  trim: { label: '剪掉空音频', color: '#64e6a8' },
  bridge_broll: { label: '保留并接 B-roll', color: '#6ad7ff' },
  compress: { label: '压缩停顿', color: '#ffd166' },
  hold_frame: { label: '画面短暂停留', color: '#f58bd1' },
}

const baseVoiceSegments = [
  { start: 0, end: 6.4, pause: 0.28, decision: 'trim' },
  { start: 6.4, end: 15.2, pause: 0.62, decision: 'bridge_broll' },
  { start: 15.2, end: 26.8, pause: 0.92, decision: 'bridge_broll' },
  { start: 26.8, end: 38.5, pause: 0.48, decision: 'hold_frame' },
]

const apiBase = 'http://127.0.0.1:8787'
const learnStorageKey = 'videoTools.learnExtractionWorkspace.v1'
const recordsStorageKey = 'videoTools.learnRecords.v1'
const toSimplified = Converter({ from: 'tw', to: 'cn' })

async function apiPost(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseResponse(response)
}

async function apiPostForm(path, formData) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    body: formData,
  })
  return parseResponse(response)
}

async function apiDelete(path) {
  const response = await fetch(`${apiBase}${path}`, { method: 'DELETE' })
  return parseResponse(response)
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || `接口请求失败，状态码 ${response.status}`)
  }
  return payload
}

function simplifyChinese(value = '') {
  return toSimplified(String(value || ''))
}

function loadLearnWorkspace() {
  try {
    const raw = localStorage.getItem(learnStorageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadSavedRecords() {
  try {
    const raw = localStorage.getItem(recordsStorageKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLearnWorkspace(value) {
  try {
    localStorage.setItem(learnStorageKey, JSON.stringify(value))
  } catch {
    // localStorage may be unavailable in privacy modes. The page can still work without persistence.
  }
}

function saveLearnRecords(records) {
  try {
    localStorage.setItem(recordsStorageKey, JSON.stringify(records))
  } catch {
    // The backend remains the source of truth when localStorage is unavailable.
  }
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = Math.floor(safeSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function buildVoiceResult(scriptLines, mode, voiceName) {
  let cursor = 0
  const segments = scriptLines.map((text, index) => {
    const base = baseVoiceSegments[index] ?? baseVoiceSegments[baseVoiceSegments.length - 1]
    const scene = storyboardScenes[index] ?? storyboardScenes[storyboardScenes.length - 1]
    const baseDuration = Number((base.end - base.start).toFixed(1))
    const start = index < baseVoiceSegments.length ? base.start : cursor
    const end = index < baseVoiceSegments.length ? base.end : Number((start + baseDuration).toFixed(1))

    cursor = end

    return {
      id: `seg-${index + 1}`,
      index,
      text,
      scene,
      start,
      end,
      duration: Number((end - start).toFixed(1)),
      pause: base.pause,
      decision: base.decision,
      subtitle: text.length > 34 ? `${text.slice(0, 34)}...` : text,
      broll: scene.broll,
      reason: scene.reason,
    }
  })

  return {
    mode,
    voiceName,
    audioUrl: '/mock/voxcp-movie-narration.wav',
    totalDuration: segments.at(-1)?.end ?? 0,
    generatedAt: '刚刚生成',
    segments,
    silences: segments.map((segment) => ({
      id: `pause-${segment.index + 1}`,
      afterSegment: segment.index,
      duration: segment.pause,
      decision: segment.decision,
      reason: segment.reason,
    })),
  }
}

function App() {
  const [active, setActive] = useState('learn')
  const [records, setRecords] = useState(() => loadSavedRecords())
  const [activeRecord, setActiveRecord] = useState(() => loadSavedRecords()[0] || null)
  const [globalStatus, setGlobalStatus] = useState('等待学习爆款文案')
  const [generatedScript, setGeneratedScript] = useState(null)
  const [voiceResult, setVoiceResult] = useState(null)
  const [exportState, setExportState] = useState('完整全流程项目')

  const activeModule = useMemo(() => modules.find((item) => item.id === active), [active])
  const scriptForNextStep = generatedScript?.length ? generatedScript : fallbackScript
  const scriptSource = generatedScript?.length ? '来自第二模块生成文案' : '使用内置示例文案'

  useEffect(() => {
    fetch(`${apiBase}/api/learn/records`)
      .then((response) => response.json())
      .then((payload) => {
        const nextRecords = payload.records || []
        setRecords(nextRecords)
        saveLearnRecords(nextRecords)
        setActiveRecord((current) => nextRecords.find((item) => item.id === current?.id) || nextRecords[0] || null)
      })
      .catch(() => setGlobalStatus('后端还没有启动，请在项目目录运行 npm run dev'))
  }, [])

  useEffect(() => {
    saveLearnRecords(records)
  }, [records])

  useEffect(() => {
    setVoiceResult(null)
  }, [generatedScript])

  const addRecord = (record) => {
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)])
    setActiveRecord(record)
  }

  const deleteRecord = async (recordId) => {
    const record = records.find((item) => item.id === recordId)
    const nextRecords = records.filter((item) => item.id !== recordId)

    setRecords(nextRecords)
    setActiveRecord((current) => {
      if (current?.id !== recordId) return current
      return nextRecords[0] || null
    })
    setGlobalStatus('正在删除学习样本')

    try {
      await apiDelete(`/api/learn/records/${encodeURIComponent(recordId)}`)
      setGlobalStatus('已删除学习样本')
    } catch (error) {
      setRecords(records)
      setActiveRecord((current) => current || record || null)
      setGlobalStatus(error.message)
    }
  }

  const updateGeneratedScript = (paragraphs = []) => {
    setGeneratedScript(paragraphs.filter(Boolean))
  }

  const exportFullProject = () => {
    setExportState('正在导出全流程项目')
    window.setTimeout(() => setExportState('已导出完整全流程项目'), 900)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><Film size={22} /></div>
          <div>
            <h1>爆款解说台</h1>
            <span>AI Video Studio</span>
          </div>
        </div>

        <nav className="moduleNav">
          {modules.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`navItem ${active === item.id ? 'active' : ''}`}
                onClick={() => setActive(item.id)}
                title={item.name}
              >
                <Icon size={20} />
                <span>{item.name}</span>
                <small>{item.status}</small>
              </button>
            )
          })}
        </nav>

        <div className="sideStatus">
          <Gauge size={18} />
          <div>
            <strong>学习库 {records.length} 条</strong>
            <span>{globalStatus}</span>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="crumb">当前模块 / {activeModule.name}</span>
            <h2>悬疑电影二创解说项目</h2>
          </div>
          {active === 'match' && (
            <div className="topActions">
              <span className="topExportStatus">{exportState}</span>
              <button className="primary" onClick={exportFullProject} title="导出完整全流程项目">
                <Download size={17} />导出
              </button>
            </div>
          )}
        </header>

        <section className={`content content-${active}`}>
          {active === 'learn' && (
            <LearningView
              records={records}
              activeRecord={activeRecord}
              setActiveRecord={setActiveRecord}
              addRecord={addRecord}
              deleteRecord={deleteRecord}
              setGlobalStatus={setGlobalStatus}
            />
          )}
          {active === 'write' && (
            <WritingView
              records={records}
              setGlobalStatus={setGlobalStatus}
              onScriptGenerated={updateGeneratedScript}
            />
          )}
          {active === 'voice' && (
            <VoiceView
              scriptLines={scriptForNextStep}
              scriptSource={scriptSource}
              voiceResult={voiceResult}
              setVoiceResult={setVoiceResult}
            />
          )}
          {active === 'match' && (
            <AudioStoryboardView
              scriptLines={scriptForNextStep}
              scriptSource={scriptSource}
              voiceResult={voiceResult}
            />
          )}
        </section>
      </main>
    </div>
  )
}

function LearningView({ records, activeRecord, setActiveRecord, addRecord, deleteRecord, setGlobalStatus }) {
  const restoredWorkspace = useMemo(() => loadLearnWorkspace(), [])
  const [mode, setMode] = useState('video')
  const [title, setTitle] = useState(restoredWorkspace?.title || '悬疑反转电影解说样本')
  const [platform, setPlatform] = useState(restoredWorkspace?.platform || '手动粘贴')
  const [scriptText, setScriptText] = useState(demoScript)
  const [url, setUrl] = useState('https://www.bilibili.com')
  const [videoFile, setVideoFile] = useState(null)
  const [extracted, setExtracted] = useState(
    restoredWorkspace?.text
      ? {
          title: restoredWorkspace.title,
          platform: restoredWorkspace.platform,
          sourceUrl: restoredWorkspace.sourceUrl,
          text: restoredWorkspace.text,
          srt: restoredWorkspace.srt || '',
        }
      : null,
  )
  const [cachedAnalysis, setCachedAnalysis] = useState(restoredWorkspace?.analysis || null)
  const [status, setStatus] = useState(
    restoredWorkspace?.text ? '已恢复上次提取文案，可继续编辑或学习' : '上传 MP4，先提取文案，再学习结构',
  )
  const [isExtracting, setIsExtracting] = useState(false)
  const [isLearning, setIsLearning] = useState(false)

  const isBusy = isExtracting || isLearning
  const visibleRecord = cachedAnalysis || activeRecord

  useEffect(() => {
    if (!extracted?.text) return
    saveLearnWorkspace({
      title: extracted.title,
      platform: extracted.platform,
      sourceUrl: extracted.sourceUrl,
      text: extracted.text,
      srt: extracted.srt || '',
      analysis: cachedAnalysis,
      savedAt: new Date().toISOString(),
    })
  }, [extracted, cachedAnalysis])

  const learnText = async ({ learnTitle, learnPlatform, text, sourceUrl, sourceType = 'text' }) => {
    setIsLearning(true)
    setStatus('正在让模型总结爆款写法模板')
    setGlobalStatus('正在学习文案结构')

    try {
      const payload = await apiPost('/api/learn/analyze-extracted-text', {
        title: learnTitle,
        platform: learnPlatform,
        text,
        sourceUrl,
        sourceType,
      })
      addRecord(payload.record)
      if (sourceType === 'video-transcript') {
        setCachedAnalysis(payload.record)
      }
      setStatus('已学习，并保存到学习库')
      setGlobalStatus('已保存到学习库，可用于第二模块生成文案')
    } catch (error) {
      setStatus(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsLearning(false)
    }
  }

  const analyzeText = async () => {
    await learnText({
      learnTitle: title,
      learnPlatform: platform,
      text: scriptText,
      sourceType: 'text',
    })
  }

  const analyzeUrl = async () => {
    setIsLearning(true)
    setStatus('正在读取网页并学习')
    setGlobalStatus('正在读取网页并学习')

    try {
      const payload = await apiPost('/api/learn/analyze-url', { url })
      addRecord(payload.record)
      setStatus('已保存到学习库')
      setGlobalStatus('已保存到学习库，可用于第二模块')
    } catch (error) {
      const message = error.message.includes('内容太少') ? '链接内容读取失败，请改用粘贴文案' : error.message
      setStatus(message)
      setGlobalStatus(message)
    } finally {
      setIsLearning(false)
    }
  }

  const analyzeVideoUrl = async () => {
    setIsLearning(true)
    setStatus('正在提取视频里的公开字幕并学习')
    setGlobalStatus('正在提取公开视频字幕')

    try {
      const payload = await apiPost('/api/learn/analyze-video-url', { url })
      addRecord(payload.record)
      setStatus(`已提取 ${payload.video?.source || '视频字幕'}，并保存到学习库`)
      setGlobalStatus('视频解说文案已保存到学习库')
    } catch (error) {
      setStatus(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsLearning(false)
    }
  }

  const extractVideoFile = async () => {
    if (!videoFile) {
      setStatus('请先选择一个 MP4 视频文件')
      return
    }

    setIsExtracting(true)
    setExtracted(null)
    setCachedAnalysis(null)
    setStatus('正在上传视频，后台会检查 ffmpeg 并提取文案')
    setGlobalStatus('正在从 MP4 提取解说文案')

    try {
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('title', title || videoFile.name)
      formData.append('platform', '本地 MP4 视频')

      const payload = await apiPostForm('/api/learn/analyze-video-file', formData)
      const nextExtracted = {
        title: simplifyChinese(payload.video?.title || videoFile.name),
        platform: simplifyChinese(payload.video?.platform || '本地 MP4 视频'),
        sourceUrl: payload.video?.sourceUrl || `local:${videoFile.name}`,
        text: simplifyChinese(payload.transcript?.text || ''),
        srt: simplifyChinese(payload.transcript?.srt || ''),
      }
      setTitle(nextExtracted.title)
      setPlatform(nextExtracted.platform)
      setExtracted(nextExtracted)
      saveLearnWorkspace({
        ...nextExtracted,
        analysis: null,
        savedAt: new Date().toISOString(),
      })
      setStatus('文案提取完成，可先编辑，再点击右上角“学习”')
      setGlobalStatus('已提取文案，等待学习')
    } catch (error) {
      setStatus(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsExtracting(false)
    }
  }

  const learnExtracted = async () => {
    if (!extracted?.text?.trim()) {
      setStatus('请先提取出文案，再点击学习')
      return
    }

    await learnText({
      learnTitle: extracted.title,
      learnPlatform: extracted.platform,
      text: extracted.text,
      sourceUrl: extracted.sourceUrl,
      sourceType: 'video-transcript',
    })
  }

  const updateExtractedText = (text) => {
    setExtracted((current) => current ? { ...current, text: simplifyChinese(text) } : current)
  }

  const panelAction = extracted?.text ? (
    <button className="miniAction" disabled={isBusy} onClick={learnExtracted}>
      <BrainCircuit size={14} />学习
    </button>
  ) : (
    visibleRecord?.modelStatus || '等待学习'
  )

  return (
    <div className="grid learnGrid">
      <section className="panel span2">
        <PanelTitle icon={Link} title="爆款来源输入" action={status} />
        <div className="modeTabs">
          <button className={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>视频解说提取</button>
          <button className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>粘贴文案</button>
          <button className={mode === 'url' ? 'active' : ''} onClick={() => setMode('url')}>网页链接分析</button>
        </div>

        {mode === 'text' ? (
          <div className="learnForm videoLearnForm">
            <div className="inputRow videoUrlRow">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="样本标题" />
              <input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="平台" />
            </div>
            <textarea value={scriptText} onChange={(event) => setScriptText(event.target.value)} />
            <button className="primary full" disabled={isBusy} onClick={analyzeText}>
              <Sparkles size={16} />分析并学习
            </button>
          </div>
        ) : mode === 'url' ? (
          <div className="learnForm">
            <div className="inputRow">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴 B 站、抖音或普通网页链接" />
              <button className="primary" disabled={isBusy} onClick={analyzeUrl}>
                <Search size={16} />读取并分析
              </button>
            </div>
            <p className="hint">网页链接只读取公开可见文字。平台拦截或内容太少时，改用粘贴文案最稳。</p>
          </div>
        ) : (
          <div className="learnForm">
            <div className="inputRow">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="可选：粘贴 B 站或抖音视频链接" />
              <button className="primary" disabled={isBusy} onClick={analyzeVideoUrl}>
                <Captions size={16} />读公开字幕
              </button>
            </div>
            <label className="uploadBox">
              <Upload size={22} />
              <span>{videoFile ? videoFile.name : '选择本地 MP4 视频'}</span>
              <small>后台会用 ffmpeg 抽音频，再用 Whisper 转成文本文案。</small>
              <input
                type="file"
                accept="video/mp4,.mp4"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
              />
            </label>
            <button className="primary full extractButton" disabled={isBusy || !videoFile} onClick={extractVideoFile}>
              <Sparkles size={16} />文案提取
            </button>
            <p className="hint">提取后会显示可编辑文案。改好口播稿，再点击下方区域右上角“学习”。</p>
          </div>
        )}
      </section>

      <section className="panel">
        <PanelTitle icon={BadgeCheck} title="已学习样本" action={`${records.length} 条`} />
        <div className="sampleList">
          {records.length === 0 && <p className="emptyState">学习库还是空的，先学习一条爆款文案。</p>}
          {records.map((record) => (
            <div
              key={record.id}
              className={`sample ${activeRecord?.id === record.id ? 'selected' : ''}`}
              onClick={() => setActiveRecord(record)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setActiveRecord(record)
                }
              }}
            >
              <button
                className="sampleDelete"
                onClick={(event) => {
                  event.stopPropagation()
                  deleteRecord(record.id)
                }}
                title="删除这个学习样本"
                aria-label={`删除 ${record.sourceTitle}`}
              >
                <Trash2 size={14} />
              </button>
              <strong>{record.sourceTitle}</strong>
              <span>{record.platform} · 评分 {record.score}</span>
              <small>{record.hook}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="panel span2">
        <PanelTitle icon={Subtitles} title="文案提取与结构拆解" action={panelAction} />
        {extracted?.text ? (
          <ExtractedTextPreview extracted={extracted} onChangeText={updateExtractedText} />
        ) : visibleRecord ? (
          <AnalysisResult record={visibleRecord} />
        ) : (
          <PreviewEmpty />
        )}
      </section>

      <section className="panel">
        <PanelTitle icon={BrainCircuit} title="可模仿写法" action="模型总结模板" />
        <div className="learningMeter">
          <strong>{visibleRecord ? '爆款写法模板' : '待学习'}</strong>
          <span>{visibleRecord?.reusableTemplate || '学习后，这里会显示模型总结出的可复用爆款写法模板。'}</span>
          <div className="chipRow">
            {(visibleRecord?.tags || ['悬念开头', '冲突推进', '反转节奏']).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {extracted?.text && cachedAnalysis && (
        <section className="panel span3">
          <PanelTitle icon={BrainCircuit} title="当前提取文案的结构拆解" action={cachedAnalysis.modelStatus || '已学习'} />
          <AnalysisResult record={cachedAnalysis} />
        </section>
      )}
    </div>
  )
}

function ExtractedTextPreview({ extracted, onChangeText }) {
  return (
    <div className="extractedPreview">
      <div>
        <strong>{extracted.title}</strong>
        <span>{extracted.platform}</span>
      </div>
      <textarea
        className="extractedTextEditor"
        value={extracted.text}
        onChange={(event) => onChangeText(event.target.value)}
        placeholder="这里会出现 Whisper 提取出的解说文案，你可以直接修改。"
      />
      <p className="hint">这里保存的是可编辑口播稿。修改后点击“学习”，下方结构拆解会按新文案重新分析。</p>
    </div>
  )
}

function WritingView({ records, setGlobalStatus, onScriptGenerated }) {
  const [requirement, setRequirement] = useState('请根据悬疑电影素材，生成 90 秒口播解说文案。开头要有强悬念，中段持续反转，结尾留下评论讨论点。')
  const [draftState, setDraftState] = useState('未生成')
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateDraft = async () => {
    setIsLoading(true)
    setDraftState('正在参考学习库生成新文案')
    setGlobalStatus('正在参考学习库生成新文案')

    try {
      const payload = await apiPost('/api/write/generate', { requirement })
      setResult(payload)
      onScriptGenerated(payload.paragraphs || [])
      setDraftState('已参考学习库生成新文案')
      setGlobalStatus('已参考学习库生成新文案')
    } catch (error) {
      setDraftState(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid writeGrid">
      <section className="panel">
        <PanelTitle icon={MousePointer2} title="创作需求" action="爆款模型" />
        <textarea value={requirement} onChange={(event) => setRequirement(event.target.value)} />
        <div className="chipRow">
          <span>90 秒</span>
          <span>悬疑反转</span>
          <span>强开头</span>
          <span>适合 SRT</span>
        </div>
        <button className="primary full actionButton" disabled={isLoading} onClick={generateDraft}>
          <Send size={16} />生成爆款文案
        </button>
      </section>

      <section className="panel">
        <PanelTitle icon={BrainCircuit} title="学习库参考" action={`${records.length} 条可用`} />
        <div className="referenceBox">
          {records.length === 0 && <p className="emptyState">学习库为空，请先去第一个模块学习样本。</p>}
          {records.slice(0, 5).map((record) => (
            <label key={record.id}>
              <input type="checkbox" defaultChecked />
              <span>{record.sourceTitle}</span>
              <p>{record.reusableTemplate}</p>
            </label>
          ))}
        </div>
      </section>

      <section className="panel sourcePanel">
        <PanelTitle icon={Sparkles} title="生成状态" action={draftState} />
        <div className="sourcePreview">
          <div className="playDisc compact"><Play fill="currentColor" size={20} /></div>
          <div>
            <strong>{result?.title || '等待生成新文案'}</strong>
            <span>{result?.modelStatus || '会自动借鉴第一模块学到的爆款逻辑'}</span>
          </div>
        </div>
        <div className="sourceMeta">
          {(result?.referenceSummary || ['先学习热门文案，再让 AI 借鉴结构生成。']).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="panel span2 tall">
        <PanelTitle icon={Wand2} title="生成文案" action={result ? '可继续送入字幕草稿' : draftState} />
        <div className="generated">
          {(result?.paragraphs || []).map((line, index) => (
            <p key={`${line}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b>{line}</p>
          ))}
          {!result && <p className="emptyState">生成后，这里会显示完整分段文案。</p>}
        </div>
      </section>

      <section className="panel tall">
        <PanelTitle icon={Captions} title="SRT 草稿" action="可导入剪辑台" />
        <div className="srtPreview">
          <code>{result?.srtDraft || '生成后，这里会出现字幕时间轴草稿。'}</code>
        </div>
      </section>
    </div>
  )
}

function AnalysisResult({ record }) {
  const rows = [
    ['钩子', record.hook],
    ['冲突', record.conflict],
    ['反转', record.reversal],
    ['互动', record.commentTrigger],
  ]

  return (
    <div className="scriptExtract">
      {rows.map(([label, detail], index) => (
        <div className="extractLine" key={label}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>{detail || '等待模型补充'}</p>
          <em>{label}</em>
        </div>
      ))}
      <div className="analysisCard">
        <strong>情绪推进</strong>
        <p>{record.emotionCurve}</p>
      </div>
      <div className="analysisCard">
        <strong>画面/口播建议</strong>
        <p>{record.visualVoiceoverTips}</p>
      </div>
    </div>
  )
}

function PreviewEmpty() {
  return (
    <div className="scriptExtract">
      {['钩子', '冲突', '反转', '互动'].map((label, index) => (
        <div className="extractLine" key={label}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <p>提取并学习后，会在这里显示模型拆出来的爆款逻辑。</p>
          <em>{label}</em>
        </div>
      ))}
    </div>
  )
}

function VoiceView({ scriptLines, scriptSource, voiceResult, setVoiceResult }) {
  const [mode, setMode] = useState('design')
  const [voiceName, setVoiceName] = useState('悬疑电影解说男声')
  const [generationState, setGenerationState] = useState(voiceResult ? '已生成' : '等待生成')

  const selectedMode = voiceModes.find((item) => item.id === mode)

  const generateVoice = () => {
    setGenerationState('生成中')
    window.setTimeout(() => {
      setVoiceResult(buildVoiceResult(scriptLines, mode, voiceName))
      setGenerationState('已生成')
    }, 800)
  }

  return (
    <div className="voiceWorkbench">
      <section className="voiceHeader">
        <div>
          <span>文案来源</span>
          <strong>{scriptSource}</strong>
        </div>
        <div>
          <span>VoxCPM 对接</span>
          <strong>预留 POST /api/voice/generate</strong>
        </div>
        <div>
          <span>配音状态</span>
          <strong>{generationState}</strong>
        </div>
        <button className="primary" onClick={generateVoice}><Sparkles size={16} />生成 AI 配音</button>
      </section>

      <section className="voiceMain">
        <aside className="voiceModePanel">
          <PanelTitle icon={AudioLines} title="配音模式" action={selectedMode.name} />
          <div className="voiceModeList">
            {voiceModes.map((item) => (
              <button
                key={item.id}
                className={mode === item.id ? 'active' : ''}
                onClick={() => setMode(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>

          {(mode === 'clone' || mode === 'ultimate') && (
            <div className="uploadMock">
              <FolderUp size={18} />
              <strong>上传参考音频</strong>
              <span>支持 wav / mp3，当前为前端演示占位</span>
            </div>
          )}

          {mode === 'ultimate' && (
            <label className="voiceTextArea">
              <span>参考音频对应文本</span>
              <textarea defaultValue="这段参考音频里的原话，用来帮助极致克隆更贴近原声音色。" />
            </label>
          )}
        </aside>

        <section className="voiceScriptPanel">
          <PanelTitle icon={Subtitles} title="待配音文案" action={`${scriptLines.length} 段`} />
          <div className="voiceSegmentList">
            {scriptLines.map((line, index) => {
              const resultSegment = voiceResult?.segments[index]
              return (
                <article className="voiceSegmentCard" key={`${line}-${index}`}>
                  <div>
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{resultSegment ? `${formatTime(resultSegment.start)} - ${formatTime(resultSegment.end)}` : '等待生成时间点'}</span>
                  </div>
                  <p>{line}</p>
                  {resultSegment && (
                    <div className="pauseDecision" style={{ '--decision-color': pauseDecisionMeta[resultSegment.decision].color }}>
                      <strong>{pauseDecisionMeta[resultSegment.decision].label}</strong>
                      <span>停顿 {resultSegment.pause}s · {resultSegment.reason}</span>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <aside className="voiceControlPanel">
          <PanelTitle icon={Gauge} title="声音控制" action="VoxCPM 参数" />
          <label>
            <span>音色描述</span>
            <input value={voiceName} onChange={(event) => setVoiceName(event.target.value)} />
          </label>
          <label>
            <span>情绪</span>
            <select defaultValue="suspense">
              <option value="suspense">悬疑压迫</option>
              <option value="calm">冷静克制</option>
              <option value="energy">强节奏爆款</option>
            </select>
          </label>
          {[
            ['语速', '58%'],
            ['连贯度', '82%'],
            ['停顿压缩', '68%'],
            ['降噪', '74%'],
            ['文本规范化', '90%'],
            ['CFG 引导', '64%'],
            ['生成步数', '70%'],
          ].map(([label, value]) => (
            <label className="controlRange" key={label}>
              <span>{label}</span>
              <input type="range" min="0" max="100" defaultValue={Number(value.replace('%', ''))} />
              <strong>{value}</strong>
            </label>
          ))}
        </aside>
      </section>

      <section className="voiceOutput">
        <div className="wavePanel">
          <div>
            <strong>{voiceResult ? 'voxcp_movie_narration.wav' : '等待生成音频'}</strong>
            <span>{voiceResult ? `${voiceResult.voiceName} · ${formatTime(voiceResult.totalDuration)} · ${voiceResult.generatedAt}` : '生成后会出现完整波形和停顿分析'}</span>
          </div>
          <div className={`waveform ${voiceResult ? 'active' : ''}`}>
            {Array.from({ length: 44 }).map((_, index) => (
              <i key={index} style={{ '--bar': (index * 17) % 74 }} />
            ))}
          </div>
          <button><Play fill="currentColor" size={16} />试听</button>
        </div>
      </section>
    </div>
  )
}

function AudioStoryboardView({ scriptLines, scriptSource, voiceResult }) {
  const [loadState, setLoadState] = useState('等待 AI 配音')

  useEffect(() => {
    if (!voiceResult) {
      setLoadState('等待 AI 配音')
      return
    }

    setLoadState('正在加载 AI 配音并重算分镜节奏')
    const timer = window.setTimeout(() => setLoadState('音频驱动分镜已完成'), 850)
    return () => window.clearTimeout(timer)
  }, [voiceResult])

  const timelineSegments = voiceResult?.segments ?? buildVoiceResult(scriptLines, 'preview', '示例配音').segments
  const hasVoice = Boolean(voiceResult)

  return (
    <div className="audioStoryboard">
      <section className="storyboardStatusBar">
        <div className="statusVideoThumb">
          <AudioLines size={22} />
        </div>
        <div className="statusVideoInfo">
          <strong>{hasVoice ? 'AI 配音已载入' : '还没有生成真实配音，当前显示示例节奏'}</strong>
          <span>{scriptSource} · {loadState}</span>
        </div>
        <div className="statusPill">
          <span>主时间线</span>
          <strong>配音音频</strong>
        </div>
        <div className="statusPill">
          <span>停顿策略</span>
          <strong>剪掉 / B-roll / 压缩 / 停帧</strong>
        </div>
        <div className="statusActions">
          <button><FolderUp size={16} />导入原视频</button>
          <button className="primary"><Sparkles size={16} />重新适配</button>
        </div>
      </section>

      <section className="audioStoryboardMain">
        <div className="storyPreview">
          <div className="previewFrame">
            <div className="sceneLayer sceneBack"></div>
            <div className="sceneLayer sceneSubject"></div>
            <span className="viewerCaption">{timelineSegments[0]?.subtitle}</span>
          </div>
          <div className="previewMeta">
            <strong>预览：音频读到哪里，字幕和画面就跟到哪里</strong>
            <span>停顿处会先判断是否剪掉空音频；需要情绪停顿时才接相关 B-roll。</span>
          </div>
        </div>

        <div className="pauseDecisionList">
          <PanelTitle icon={Scissors} title="停顿处理决策" action={`${timelineSegments.length} 处`} />
          {timelineSegments.map((segment) => {
            const meta = pauseDecisionMeta[segment.decision]
            return (
              <article className="decisionCard" key={segment.id} style={{ '--decision-color': meta.color }}>
                <div>
                  <strong>{String(segment.index + 1).padStart(2, '0')} · {meta.label}</strong>
                  <span>{segment.pause}s</span>
                </div>
                <p>{segment.decision === 'trim' ? '普通换气停顿，剪掉后下一句直接接上，口播更紧。' : segment.reason}</p>
                <em>{segment.decision === 'bridge_broll' ? `推荐画面：${segment.broll}` : `对应画面：${segment.scene.visual}`}</em>
              </article>
            )
          })}
        </div>
      </section>

      <section className="audioDrivenTimeline">
        <div className="timelineHeaderBar">
          <strong>音频驱动时间线</strong>
          <span>{hasVoice ? voiceResult.audioUrl : '示例音频节奏'}</span>
          <span>{formatTime(timelineSegments.at(-1)?.end ?? 0)}</span>
        </div>
        <div className="timelineRows">
          <TimelineRow label="配音轨" kind="voice" segments={timelineSegments} />
          <TimelineRow label="分镜轨" kind="scene" segments={timelineSegments} />
          <TimelineRow label="字幕轨" kind="subtitle" segments={timelineSegments} />
          <TimelineRow label="停顿处理" kind="pause" segments={timelineSegments} />
        </div>
      </section>
    </div>
  )
}

function TimelineRow({ label, kind, segments }) {
  return (
    <div className="audioTimelineRow">
      <label>{label}</label>
      <div className="audioTimelineLane">
        {segments.map((segment) => {
          const meta = pauseDecisionMeta[segment.decision]
          const width = Math.max(170, segment.duration * 34)
          return (
            <span
              key={`${kind}-${segment.id}`}
              className={`audioBlock ${kind}`}
              style={{
                '--block-color': kind === 'pause' ? meta.color : segment.scene.tone,
                width: `${width}px`,
              }}
            >
              <strong>
                {kind === 'voice' && `音频 ${segment.duration}s`}
                {kind === 'scene' && segment.scene.type}
                {kind === 'subtitle' && segment.subtitle}
                {kind === 'pause' && meta.label}
              </strong>
              <em>{kind === 'pause' ? `${segment.pause}s` : `${formatTime(segment.start)}-${formatTime(segment.end)}`}</em>
            </span>
          )
        })}
      </div>
    </div>
  )
}

function PanelTitle({ icon: Icon, title, action }) {
  return (
    <div className="panelTitle">
      <div><Icon size={18} /><strong>{title}</strong></div>
      {typeof action === 'string' ? <span>{action}</span> : action}
    </div>
  )
}

export default App
