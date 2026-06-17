import React, { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BrainCircuit,
  Captions,
  ChevronRight,
  Clapperboard,
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
  Wand2,
} from 'lucide-react'

const modules = [
  { id: 'learn', name: '爆款文案学习', icon: BrainCircuit, status: '结构学习库' },
  { id: 'write', name: '文案生成', icon: Wand2, status: '参考爆款逻辑' },
  { id: 'match', name: '智能匹配剪辑', icon: Scissors, status: 'A/B-roll 匹配' },
  { id: 'edit', name: '剪辑工作台', icon: Clapperboard, status: '字幕与配音' },
]

const demoScript =
  '如果你只看了开头，绝对猜不到这个男人接下来会主动走进危险。所有人都以为他是在逃命，可镜头一转，他其实早就知道出口在哪里。真正可怕的不是房间里的机关，而是他每一次选择都在把观众带进误区。等真相出现时，你才发现前面所有看似无用的细节，都是导演提前埋下的答案。你觉得他最后赢了吗？还是从一开始，他就被困在别人写好的剧本里？'

const apiBase = 'http://127.0.0.1:8787'

const matchRows = [
  { time: '00:00-00:08', script: '先用一句强悬念抓住观众', a: '旁白铺垫', b: '主角背影+门缝光影' },
  { time: '00:08-00:22', script: '解释人物处境和目标', a: '解说重点', b: '房间全景+特写剪入' },
  { time: '00:22-00:39', script: '制造第一次认知反转', a: '情绪加速', b: '监控画面+回头镜头' },
  { time: '00:39-00:58', script: '承接上文进入高能段', a: '关键推理', b: '追逐+道具细节' },
]

async function apiPost(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || '接口请求失败')
  }

  return payload
}

function App() {
  const [active, setActive] = useState('learn')
  const [records, setRecords] = useState([])
  const [activeRecord, setActiveRecord] = useState(null)
  const [globalStatus, setGlobalStatus] = useState('等待学习爆款文案')

  const activeModule = useMemo(() => modules.find((item) => item.id === active), [active])
  const showTimeline = active === 'match'

  useEffect(() => {
    fetch(`${apiBase}/api/learn/records`)
      .then((response) => response.json())
      .then((payload) => {
        setRecords(payload.records || [])
        setActiveRecord(payload.records?.[0] || null)
      })
      .catch(() => setGlobalStatus('后端还没启动，请运行 npm run dev'))
  }, [])

  const addRecord = (record) => {
    setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)])
    setActiveRecord(record)
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
          <div className="topActions">
            <button><FolderUp size={17} />导入</button>
            <button className="primary"><Sparkles size={17} />生成</button>
            <button><Download size={17} />导出</button>
          </div>
        </header>

        <section className={`content ${showTimeline ? 'withTimeline' : ''}`}>
          {active === 'learn' && (
            <LearningView
              records={records}
              activeRecord={activeRecord}
              setActiveRecord={setActiveRecord}
              addRecord={addRecord}
              setGlobalStatus={setGlobalStatus}
            />
          )}
          {active === 'write' && (
            <WritingView records={records} setGlobalStatus={setGlobalStatus} />
          )}
          {active === 'match' && <MatchView />}
          {active === 'edit' && <EditView />}
        </section>

        {showTimeline && <Timeline />}
      </main>
    </div>
  )
}

function LearningView({ records, activeRecord, setActiveRecord, addRecord, setGlobalStatus }) {
  const [mode, setMode] = useState('text')
  const [title, setTitle] = useState('悬疑反转电影解说样本')
  const [platform, setPlatform] = useState('手动粘贴')
  const [scriptText, setScriptText] = useState(demoScript)
  const [url, setUrl] = useState('https://www.bilibili.com')
  const [status, setStatus] = useState('粘贴爆款文案，或输入网页链接开始学习')
  const [isLoading, setIsLoading] = useState(false)

  const analyzeText = async () => {
    setIsLoading(true)
    setStatus('正在让模型拆解爆款逻辑')
    setGlobalStatus('正在让模型拆解爆款逻辑')

    try {
      const payload = await apiPost('/api/learn/analyze-text', {
        title,
        platform,
        text: scriptText,
      })
      addRecord(payload.record)
      setStatus('已保存到学习库')
      setGlobalStatus('已保存到学习库')
    } catch (error) {
      setStatus(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeUrl = async () => {
    setIsLoading(true)
    setStatus('正在读取网页')
    setGlobalStatus('正在读取网页')

    try {
      const payload = await apiPost('/api/learn/analyze-url', { url })
      addRecord(payload.record)
      setStatus('已保存到学习库')
      setGlobalStatus('已保存到学习库')
    } catch (error) {
      const message = error.message.includes('文本太少') ? '链接内容读取失败，请改用粘贴文案' : error.message
      setStatus(message)
      setGlobalStatus(message)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeVideoUrl = async () => {
    setIsLoading(true)
    setStatus('正在提取视频里的解说文案')
    setGlobalStatus('正在提取视频里的解说文案')

    try {
      const payload = await apiPost('/api/learn/analyze-video-url', { url })
      addRecord(payload.record)
      setStatus(`已提取 ${payload.video?.source || '视频字幕'}，并保存到学习库`)
      setGlobalStatus('视频解说文案已保存到学习库')
    } catch (error) {
      setStatus(error.message)
      setGlobalStatus(error.message)
    } finally {
      setIsLoading(false)
    }
  }

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
          <div className="learnForm">
            <div className="inputRow">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="样本标题" />
              <input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="平台" />
            </div>
            <textarea value={scriptText} onChange={(event) => setScriptText(event.target.value)} />
            <button className="primary full" disabled={isLoading} onClick={analyzeText}>
              <Sparkles size={16} />分析并学习
            </button>
          </div>
        ) : mode === 'url' ? (
          <div className="learnForm">
            <div className="inputRow">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴 B站、抖音或普通网页链接" />
              <button className="primary" disabled={isLoading} onClick={analyzeUrl}>
                <Search size={16} />读取并分析
              </button>
            </div>
            <p className="hint">网页链接只读取公开可见文字。如果平台拦截或内容太少，就改用粘贴文案，最稳。</p>
          </div>
        ) : (
          <div className="learnForm">
            <div className="inputRow">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴 B站或抖音视频链接" />
              <button className="primary" disabled={isLoading} onClick={analyzeVideoUrl}>
                <Captions size={16} />提取并分析
              </button>
            </div>
            <p className="hint">支持识别 B站和抖音链接。优先读取公开字幕、口播文本或视频文案；如果平台没有公开这些内容，就需要后续接入语音转文字。</p>
          </div>
        )}
      </section>

      <section className="panel">
        <PanelTitle icon={BadgeCheck} title="已学习样本" action={`${records.length} 条`} />
        <div className="sampleList">
          {records.length === 0 && <p className="emptyState">学习库还是空的，先学习一条爆款文案。</p>}
          {records.map((record) => (
            <button
              key={record.id}
              className={`sample ${activeRecord?.id === record.id ? 'selected' : ''}`}
              onClick={() => setActiveRecord(record)}
            >
              <strong>{record.sourceTitle}</strong>
              <span>{record.platform} · 评分 {record.score}</span>
              <small>{record.hook}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel span2">
        <PanelTitle icon={Subtitles} title="文案提取与结构拆解" action={activeRecord?.modelStatus || '等待学习'} />
        {activeRecord ? <AnalysisResult record={activeRecord} /> : <PreviewEmpty />}
      </section>

      <section className="panel">
        <PanelTitle icon={BrainCircuit} title="可模仿写法" action="结构记忆" />
        <div className="learningMeter">
          <strong>{activeRecord ? '已学会一条套路' : '待学习'}</strong>
          <span>{activeRecord?.reusableTemplate || '这里会显示模型总结出的爆款写法模板。'}</span>
          <div className="chipRow">
            {(activeRecord?.tags || ['悬念开头', '冲突推进', '反转节奏']).map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function WritingView({ records, setGlobalStatus }) {
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
          {records.length === 0 && <p className="emptyState">学习库为空，请先去第一模块学习样本。</p>}
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
          <p>学习后会在这里显示模型拆出来的爆款逻辑。</p>
          <em>{label}</em>
        </div>
      ))}
    </div>
  )
}

function MatchView() {
  return (
    <div className="grid editGrid">
      <section className="panel span2">
        <PanelTitle icon={FolderUp} title="原视频导入" action="素材 01 已载入" />
        <div className="videoPreview large">
          <div className="playDisc"><Play fill="currentColor" size={30} /></div>
          <div>
            <strong>source_movie_clip.mp4</strong>
            <span>1920x1080 · 23.98fps · 08:12</span>
          </div>
        </div>
      </section>
      <section className="panel">
        <PanelTitle icon={Sparkles} title="B-roll 推荐" action="12 个镜头" />
        <div className="brollGrid">
          {['门缝光影', '人物特写', '空镜压迫', '追逐段落', '道具细节', '反应镜头'].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
      <section className="panel span3 tall">
        <PanelTitle icon={Scissors} title="文案与画面一对一匹配" action="自动对齐" />
        <div className="matchTable">
          {matchRows.map((row) => (
            <div className="matchRow" key={row.time}>
              <span>{row.time}</span>
              <p>{row.script}</p>
              <em>{row.a}</em>
              <strong>{row.b}</strong>
              <ChevronRight size={18} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function EditView() {
  return (
    <div className="grid editGrid">
      <section className="panel span3 tall">
        <PanelTitle icon={Clapperboard} title="剪辑工作台" action="演示原型" />
        <div className="videoPreview large">
          <div className="playDisc"><Play fill="currentColor" size={30} /></div>
          <div>
            <strong>真正的反转，从这一秒才开始</strong>
            <span>这里保留剪映式工作台入口，后续可接入素材和字幕轨道。</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function PanelTitle({ icon: Icon, title, action }) {
  return (
    <div className="panelTitle">
      <div><Icon size={18} /><strong>{title}</strong></div>
      <span>{action}</span>
    </div>
  )
}

function Timeline() {
  const trackData = [
    { name: '原视频轨', color: '#53c7ff', blocks: ['导入片段 01', '导入片段 02', '转场补帧'] },
    { name: 'A-roll 解说轨', color: '#ffcc66', blocks: ['开场钩子', '剧情推进', '结尾金句'] },
    { name: 'B-roll 衔接轨', color: '#7cf29a', blocks: ['人物特写', '环境空镜', '高能动作', '细节回放'] },
    { name: '字幕轨', color: '#f48cff', blocks: ['SRT 01', 'SRT 02', '强调字幕'] },
  ]

  return (
    <section className="timeline">
      <div className="timelineHeader">
        <strong>多轨时间线</strong>
        <span>00:00:00:00</span>
        <span>磁吸 · 自动波形 · 字幕联动</span>
      </div>
      <div className="tracks">
        {trackData.map((track, trackIndex) => (
          <div className="track" key={track.name}>
            <label>{track.name}</label>
            <div className="trackLane">
              {track.blocks.map((block, index) => (
                <span
                  key={block}
                  style={{
                    '--block-color': track.color,
                    width: `${130 + index * 24}px`,
                    marginLeft: index === 0 ? `${trackIndex * 12}px` : '8px',
                  }}
                >
                  {block}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default App
