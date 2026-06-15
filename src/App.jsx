import React, { useMemo, useState } from 'react'
import {
  AudioLines,
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
  Mic2,
  MousePointer2,
  Play,
  Plus,
  Scissors,
  Search,
  Send,
  Settings2,
  Sparkles,
  Subtitles,
  Wand2,
} from 'lucide-react'

const modules = [
  { id: 'learn', name: '爆款文案学习', icon: BrainCircuit, status: '学习库 128 条' },
  { id: 'write', name: '文案生成', icon: Wand2, status: 'GPT 相似创作' },
  { id: 'match', name: '智能匹配剪辑', icon: Scissors, status: 'A/B-roll 匹配' },
  { id: 'edit', name: '剪辑工作台', icon: Clapperboard, status: '字幕与配音' },
]

const hotVideos = [
  { title: '三分钟讲透冷门悬疑片反转', platform: '抖音', heat: '96.8w', hook: '开头 5 秒制造强冲突' },
  { title: '废土求生电影高能解说', platform: 'B站', heat: '72.4w', hook: '悬念问题贯穿全片' },
  { title: '真实案件改编电影拆解', platform: '小红书', heat: '48.9w', hook: '情绪递进非常稳定' },
]

const referenceScripts = [
  '如果你只看了开头，绝对猜不到这个男人接下来会做什么。',
  '这部电影最狠的地方，不是反转，而是它把观众也变成了帮凶。',
  '当所有人都以为真相出现时，镜头却悄悄给出了另一个答案。',
]

const generatedParagraphs = [
  '开场先抛出一个结果级悬念：主角明明已经逃出房间，却在十分钟后主动回到了危险中心。',
  '随后用三段画面快速建立人物关系，让观众知道他不是冲动，而是在用自己做诱饵。',
  '中段切入连续反转，把原本普通的追逃戏，升级成一场关于身份与记忆的心理博弈。',
  '结尾保留一句可二创的金句，让观众在评论区讨论：真正被困住的，到底是主角，还是看完故事的我们。',
]

const matchRows = [
  { time: '00:00-00:08', script: '先用一句强悬念抓住观众', a: '旁白铺垫', b: '主角背影+门缝光影' },
  { time: '00:08-00:22', script: '解释人物处境和目标', a: '解说重点', b: '房间全景+特写剪入' },
  { time: '00:22-00:39', script: '制造第一次认知反转', a: '情绪加速', b: '监控画面+回头镜头' },
  { time: '00:39-00:58', script: '承接上文进入高能段', a: '关键推理', b: '追逐+道具细节' },
]

const trackData = [
  { name: '原视频轨', color: '#53c7ff', blocks: ['导入片段 01', '导入片段 02', '转场补帧'] },
  { name: 'A-roll 解说轨', color: '#ffcc66', blocks: ['开场钩子', '剧情推进', '结尾金句'] },
  { name: 'B-roll 衔接轨', color: '#7cf29a', blocks: ['人物特写', '环境空镜', '高能动作', '细节回放'] },
  { name: '字幕轨', color: '#f48cff', blocks: ['SRT 01', 'SRT 02', '强调字幕'] },
  { name: 'AI 配音轨', color: '#b9a7ff', blocks: ['磁性男声', '停顿优化', '情绪增强'] },
]

const mediaClips = [
  { name: '剧情开场.mp4', duration: '00:12', tone: '#8fd8ff' },
  { name: '走廊压迫感.mp4', duration: '00:10', tone: '#79d083' },
  { name: '人物回头.mp4', duration: '00:08', tone: '#f06f5f' },
  { name: '房间全景.mp4', duration: '00:12', tone: '#b08cff' },
  { name: '监控画面.mp4', duration: '00:10', tone: '#65b7ff' },
  { name: '道具细节.mp4', duration: '00:09', tone: '#f3bd54' },
  { name: '追逐片段.mp4', duration: '00:13', tone: '#54d4c5' },
  { name: '结尾反转.mp4', duration: '00:11', tone: '#e978b9' },
]

const editTimelineClips = [
  '26_开场', '25_回廊', '24_灯光', '23_背影', '22_道具', '21_特写',
  '20_推门', '19_追逐', '18_监控', '17_反应', '16_线索', '15_争执',
  '14_回忆', '13_空镜', '12_逃离', '11_回头', '10_推理', '09_真相',
  '08_反转', '07_收束', '06_金句', '05_字幕', '04_尾帧',
]

function App() {
  const [active, setActive] = useState('learn')
  const [selectedVideo, setSelectedVideo] = useState(hotVideos[0])
  const [learnState, setLearnState] = useState('待提取')
  const [draftState, setDraftState] = useState('未生成')
  const [subtitleSize, setSubtitleSize] = useState(42)
  const [voice, setVoice] = useState('电影感男声')

  const activeModule = useMemo(() => modules.find((item) => item.id === active), [active])
  const showTimeline = active === 'match'

  const runLearning = () => {
    setLearnState('学习中')
    window.setTimeout(() => setLearnState('已学习 12 个爆款结构'), 700)
  }

  const generateDraft = () => {
    setDraftState('生成中')
    window.setTimeout(() => setDraftState('已生成，可加入字幕草稿'), 700)
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
            <strong>项目健康度 92%</strong>
            <span>文案节奏、画面匹配、字幕可读性良好</span>
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
              selectedVideo={selectedVideo}
              setSelectedVideo={setSelectedVideo}
              learnState={learnState}
              runLearning={runLearning}
            />
          )}
          {active === 'write' && (
            <WritingView draftState={draftState} generateDraft={generateDraft} />
          )}
          {active === 'match' && <MatchView />}
          {active === 'edit' && (
            <EditView
              subtitleSize={subtitleSize}
              setSubtitleSize={setSubtitleSize}
              voice={voice}
              setVoice={setVoice}
            />
          )}
        </section>

        {showTimeline && <Timeline />}
      </main>
    </div>
  )
}

function LearningView({ selectedVideo, setSelectedVideo, learnState, runLearning }) {
  return (
    <div className="grid learnGrid">
      <section className="panel span2">
        <PanelTitle icon={Link} title="网页视频读取" action="批量采集" />
        <div className="inputRow">
          <input value="https://video.example.com/hot/story-9281" readOnly />
          <button className="primary"><Search size={16} />读取</button>
        </div>
        <div className="videoPreview">
          <div className="playDisc"><Play fill="currentColor" size={28} /></div>
          <div>
            <strong>{selectedVideo.title}</strong>
            <span>{selectedVideo.platform} · 热度 {selectedVideo.heat} · 02:47</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={BadgeCheck} title="热门爆款样本" action="热度排序" />
        <div className="sampleList">
          {hotVideos.map((video) => (
            <button
              key={video.title}
              className={`sample ${selectedVideo.title === video.title ? 'selected' : ''}`}
              onClick={() => setSelectedVideo(video)}
            >
              <strong>{video.title}</strong>
              <span>{video.platform} · {video.heat}</span>
              <small>{video.hook}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel span2">
        <PanelTitle icon={Subtitles} title="文案提取与结构拆解" action={learnState} />
        <div className="scriptExtract">
          {referenceScripts.map((line, index) => (
            <div className="extractLine" key={line}>
              <span>0{index + 1}</span>
              <p>{line}</p>
              <em>{['钩子', '冲突', '反转'][index]}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={BrainCircuit} title="GPT 自学习状态" action="结构记忆" />
        <div className="learningMeter">
          <strong>{learnState}</strong>
          <span>钩子密度、情绪曲线、反转节奏、结尾互动</span>
          <button className="primary full" onClick={runLearning}>
            <Sparkles size={16} />提取并学习
          </button>
        </div>
      </section>
    </div>
  )
}

function WritingView({ draftState, generateDraft }) {
  const [videoState, setVideoState] = useState('等待导入或检索')
  const [sourceMode, setSourceMode] = useState('需求识别')

  const importSourceVideo = () => {
    setSourceMode('原视频 01')
    setVideoState('已导入原视频，可浏览生成解说')
  }

  const searchSourceVideo = () => {
    setSourceMode('联网检索片名')
    setVideoState('已找到相关片源/剧情资料')
  }

  return (
    <div className="grid writeGrid">
      <section className="panel">
        <PanelTitle icon={MousePointer2} title="创作需求" action="爆款模型" />
        <textarea
          readOnly
          value={'请根据悬疑电影素材，生成 90 秒口播解说文案。开头要有强悬念，中段持续反转，结尾留下评论讨论点。'}
        />
        <div className="chipRow">
          <span>90 秒</span>
          <span>悬疑反转</span>
          <span>强开头</span>
          <span>适合 SRT</span>
        </div>
      </section>

      <section className="panel sourcePanel">
        <PanelTitle icon={FolderUp} title="原视频参考" action={videoState} />
        <div className="sourcePreview">
          <div className="playDisc compact"><Play fill="currentColor" size={20} /></div>
          <div>
            <strong>悬疑电影素材 · 样片预览</strong>
            <span>1080P · 23.98fps · 01:37:42</span>
          </div>
        </div>
        <div className="sourceActions">
          <button onClick={importSourceVideo}><FolderUp size={16} />导入原视频</button>
          <button onClick={searchSourceVideo}><Search size={16} />联网搜索片源</button>
        </div>
        <div className="sourceMeta">
          <span>识别片名：迷雾回廊</span>
          <span>当前来源：{sourceMode}</span>
          <span>关键节点：失踪、回溯、身份反转</span>
        </div>
        <div className="searchResults">
          {['剧情梗概已匹配', '人物关系已抽取', '高能片段 7 处'].map((item) => (
            <em key={item}>{item}</em>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={BrainCircuit} title="相似文案库" action="3 条已选" />
        <div className="referenceBox">
          {referenceScripts.map((line, index) => (
            <label key={line}>
              <input type="checkbox" defaultChecked />
              <span>参考 {index + 1}</span>
              <p>{line}</p>
            </label>
          ))}
        </div>
      </section>

      <section className="panel span2 tall">
        <PanelTitle
          icon={Wand2}
          title="生成文案"
          action={draftState === '已生成，可加入字幕草稿' ? '基于创作需求 + 原视频参考' : draftState}
        />
        <div className="sourceTags">
          <span>参考原视频 01</span>
          <span>联网检索片名</span>
          <span>剧情节点已匹配</span>
        </div>
        <div className="generated">
          {generatedParagraphs.map((line, index) => (
            <p key={line}><b>{String(index + 1).padStart(2, '0')}</b>{line}</p>
          ))}
        </div>
        <div className="buttonRow">
          <button className="primary" onClick={generateDraft}><Send size={16} />生成爆款文案</button>
          <button><Captions size={16} />加入字幕草稿</button>
        </div>
      </section>

      <section className="panel tall">
        <PanelTitle icon={Captions} title="SRT 草稿" action="可导入第四模块" />
        <div className="srtPreview">
          <code>1<br />00:00:00,000 --&gt; 00:00:05,400<br />如果你只看了开头...</code>
          <code>2<br />00:00:05,400 --&gt; 00:00:12,000<br />真正的反转从这里开始...</code>
          <button className="full"><Plus size={16} />保存为字幕草稿</button>
        </div>
      </section>
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
    <div className="capcutBench">
      <section className="capcutTop">
        <aside className="mediaPanel">
          <div className="mediaTabs">
            <button className="active"><Film size={18} />媒体</button>
            <button><AudioLines size={18} />音频</button>
            <button><Captions size={18} />文本</button>
          </div>
          <div className="mediaBody">
            <div className="mediaLibrary">
              <div className="mediaSearch">
                <Search size={15} />
                <span>搜索文件名称、画面元素、台词</span>
              </div>
              <div className="mediaToolbar">
                <button><Plus size={15} />导入</button>
                <button>排序</button>
                <button>全部</button>
              </div>
              <span className="libraryLabel">全部</span>
              <div className="clipGrid">
                {mediaClips.map((clip, index) => (
                  <div className="clipCard" key={clip.name}>
                    <div className="clipThumb" style={{ '--clip-tone': clip.tone }}>
                      <span>已添加</span>
                      <em>{clip.duration}</em>
                    </div>
                    <strong>{String(index + 1).padStart(2, '0')}_{clip.name}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="playerPanel">
          <div className="capcutPanelHeader">
            <strong>播放器</strong>
            <button><Settings2 size={16} /></button>
          </div>
          <div className="capcutViewer">
            <div className="viewerFrame">
              <div className="sceneLayer sceneBack"></div>
              <div className="sceneLayer sceneSubject"></div>
              <span className="viewerCaption">真正的反转，从这一秒才开始</span>
            </div>
          </div>
          <div className="playerControls">
            <span><b>00:00:00:00</b> / 00:04:31:00</span>
            <button><Play fill="currentColor" size={18} /></button>
            <div>
              <button>比例</button>
              <button>全屏</button>
            </div>
          </div>
        </section>

        <aside className="adjustPanel">
          <div className="capcutPanelHeader">
            <strong>画面与字幕</strong>
          </div>
          <div className="adjustBody">
            <div className="adjustGroup">
              <div className="adjustTitle">
                <span>视频画面</span>
                <em>已选主视频</em>
              </div>
              {[
                ['位置 X', '0'],
                ['位置 Y', '-12'],
                ['缩放', '112%'],
                ['旋转', '0°'],
              ].map(([label, value]) => (
                <label className="adjustRow" key={label}>
                  <span>{label}</span>
                  <input type="range" min="0" max="100" defaultValue={label === '缩放' ? 62 : 50} />
                  <strong>{value}</strong>
                </label>
              ))}
            </div>

            <div className="adjustGroup">
              <div className="adjustTitle">
                <span>字幕样式</span>
                <em>SRT 字幕层</em>
              </div>
              {[
                ['字体大小', '42px'],
                ['字幕 X', '0'],
                ['字幕 Y', '78%'],
                ['描边强度', '6'],
              ].map(([label, value]) => (
                <label className="adjustRow" key={label}>
                  <span>{label}</span>
                  <input type="range" min="0" max="100" defaultValue={label === '字幕 Y' ? 78 : 48} />
                  <strong>{value}</strong>
                </label>
              ))}
              <div className="fontControls">
                <button className="active">粗体</button>
                <button>阴影</button>
                <button>居中</button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="capcutTimeline">
        <div className="timelineToolBar">
          <div>
            {['选择', '撤销', '重做', '分割', '删除', '保护', '截图'].map((tool) => (
              <button key={tool}>{tool}</button>
            ))}
          </div>
          <div>
            {['录音', '吸附', '联动', '缩放 -', '缩放 +'].map((tool) => (
              <button key={tool}>{tool}</button>
            ))}
          </div>
        </div>
        <div className="timeRuler">
          {['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'].map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>
        <div className="timelineStage">
          <div className="playhead">
            <span></span>
          </div>
          <div className="trackLabels">
            <span>封面</span>
            <span>主视频</span>
          </div>
          <div className="capcutTracks">
            <div className="coverTrack">
              <strong>封面</strong>
            </div>
            <div className="mainClipTrack">
              {editTimelineClips.map((clip, index) => (
                <div
                  className="timelineClip"
                  key={clip}
                  style={{ '--clip-index': index }}
                >
                  <span>{clip}</span>
                  <em></em>
                </div>
              ))}
            </div>
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
