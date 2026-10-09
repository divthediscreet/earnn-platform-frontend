import Link from 'next/link'
import type { HomeTool } from './tools'
import s from './Home.module.css'

/** One small decorative cue per tool so the six cards do not read as copies of each other. */
function Cue({ tool }: { tool: HomeTool }) {
  switch (tool.visual) {
    case 'wallet':
      return <div className={s.cue}><span><i className="ti ti-pencil" aria-hidden /> Type it in</span><em>or</em><span><i className="ti ti-file-upload" aria-hidden /> Upload a statement</span></div>
    case 'compare':
      return <div className={s.cue}><span>Fees</span><em>·</em><span>Rewards</span><em>·</em><span>Perks</span></div>
    case 'tap':
      return <div className={`${s.cue} ${s.cueSearch}`}><i className="ti ti-search" aria-hidden /><span>Search Lulu, Noon, Talabat…</span></div>
    case 'calendar':
      return <div className={s.cue}><span>School fees</span><em>·</em><span>Insurance</span><em>·</em><span>Travel</span></div>
    case 'travel':
      return <div className={s.cue}><span><i className="ti ti-plane" aria-hidden /> Flights</span><em>+</em><span><i className="ti ti-armchair" aria-hidden /> Upgrades</span></div>
    default:
      return null
  }
}

function ChatPreview() {
  return (
    <div className={s.chatPreview} aria-hidden>
      <div className={s.bubbleUser}>Which card should I use on Amazon?</div>
      <div className={s.bubbleEarnie}><span>e</span>Happy to help — tell me how you shop.</div>
    </div>
  )
}

type Props = {
  tool: HomeTool
  index: number
  active: boolean
  onSelect: (index: number) => void
  onKeyNav: (index: number, dir: -1 | 1) => void
}

export default function ToolDiscoveryCard({ tool, index, active, onSelect, onKeyNav }: Props) {
  const panelId = `tool-panel-${tool.key}`
  return (
    <article
      className={`${s.tool} ${active ? s.toolActive : ''} ${tool.image ? '' : s.toolChat}`}
      style={{ ['--accent' as string]: tool.accent }}
      aria-label={tool.name}
    >
      {tool.image && (
        <img
          className={s.toolPhoto}
          src={tool.image.src}
          alt=""
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
          style={{ objectPosition: `${tool.image.fx * 100}% ${tool.image.fy * 100}%` }}
        />
      )}
      <div className={s.toolVeil} aria-hidden />

      {/* Collapsed teaser: name, hook, icon only */}
      <div className={s.teaser} aria-hidden={active}>
        <span className={s.teaserIcon}><i className={`ti ${tool.icon}`} aria-hidden /></span>
        <span className={s.teaserName}>{tool.name}</span>
        <span className={s.teaserHook}>{tool.hook[0]} {tool.hook[1]}</span>
      </div>

      {/* Whole card is the control while collapsed */}
      <button
        type="button"
        className={s.toolHit}
        aria-expanded={active}
        aria-controls={panelId}
        aria-label={`${tool.name}: ${tool.hook[0]} ${tool.hook[1]}`}
        tabIndex={active ? -1 : 0}
        onClick={() => onSelect(index)}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') { e.preventDefault(); onKeyNav(index, 1) }
          if (e.key === 'ArrowLeft') { e.preventDefault(); onKeyNav(index, -1) }
        }}
      />

      {/* Expanded content */}
      <div className={s.panel} id={panelId} aria-hidden={!active} {...(active ? {} : { inert: true })}>
        {tool.visual === 'chat' ? <ChatPreview /> : <Cue tool={tool} />}
        <div className={s.panelText}>
          <span className={s.panelLabel}>{tool.name}</span>
          <h3>{tool.headline}</h3>
          <p>{tool.description}</p>
          <Link href={tool.route} className="btn-primary">{tool.cta} <i className="ti ti-arrow-right" aria-hidden /></Link>
        </div>
      </div>
    </article>
  )
}
