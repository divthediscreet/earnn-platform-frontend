'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TOOLS } from './tools'
import s from './Home.module.css'

const SLIDE_MS = 4000

// The six Earnn tools as a full-width slider at the top of the homepage. The current tool sits in the middle (about 80%
// of the window, capped on very wide screens) with the previous and next tools peeking in on both sides. It moves on by
// itself every 4 seconds and circles endlessly: the last tool is repeated before the first and the first after the last,
// and when the track stops on a repeat it silently jumps to the real slide (they look identical). It stops while the
// visitor is interacting with it (hover, touch, keyboard focus, the pause button) or cannot see it.
const n = TOOLS.length
// track positions: 0 = repeat of the last tool, 1..n = the tools, n + 1 = repeat of the first tool
const SLIDES = [TOOLS[n - 1], ...TOOLS, TOOLS[0]]
const realIndex = (pos: number) => (pos - 1 + n) % n

/** Scroll offset that centres the slide at track position `p`. */
const offsetOf = (track: HTMLDivElement, p: number) => {
  const slide = track.children[p] as HTMLElement
  return slide.offsetLeft - track.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2
}

export default function ToolSlider() {
  const trackRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [pos, setPos] = useState(1)
  const [still, setStill] = useState(false)        // true for a moment around a silent jump, so nothing animates
  const [held, setHeld] = useState(false)          // hover, touch or keyboard focus
  const [paused, setPaused] = useState(false)      // the visitor pressed pause
  const [onScreen, setOnScreen] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const [reduced, setReduced] = useState(false)
  const moving = useRef(0)                         // until when a scroll we started ourselves is still under way

  const current = realIndex(pos)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    const el = sectionRef.current
    const io = el && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => setOnScreen(entries.some(e => e.isIntersecting)), { threshold: 0.3 })
      : null
    if (el && io) io.observe(el)
    else setOnScreen(true)
    return () => { mq.removeEventListener('change', sync); document.removeEventListener('visibilitychange', onVisibility); io?.disconnect() }
  }, [])

  // Start on the first real tool (position 1), not on the repeat of the last one.
  useLayoutEffect(() => {
    const track = trackRef.current
    if (track) track.scrollTo({ left: offsetOf(track, 1), behavior: 'auto' })
  }, [])

  // Keep the current slide centred when the window is resized.
  useEffect(() => {
    const onResize = () => {
      const track = trackRef.current
      if (track) track.scrollTo({ left: offsetOf(track, pos), behavior: 'auto' })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos])

  const goTo = useCallback((p: number) => {
    const track = trackRef.current
    if (!track || !track.children[p]) return
    setPos(p)
    moving.current = Date.now() + 1100
    track.scrollTo({ left: offsetOf(track, p), behavior: reduced ? 'auto' : 'smooth' })
  }, [reduced])

  const next = useCallback(() => goTo(pos + 1), [pos, goTo])

  // Swiping or scrolling by hand updates the current slide; once it stops on a repeat, jump to the real slide.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    let settle = 0
    const posNow = () => {
      const pitch = (track.children[2] as HTMLElement).offsetLeft - (track.children[1] as HTMLElement).offsetLeft
      return pitch > 0 ? Math.min(n + 1, Math.max(0, Math.round((track.scrollLeft - offsetOf(track, 0)) / pitch))) : 1
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { if (Date.now() >= moving.current) setPos(posNow()) })
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const p = posNow()
        if (p !== 0 && p !== n + 1) return
        const target = p === 0 ? n : 1
        setStill(true)
        track.scrollTo({ left: offsetOf(track, target), behavior: 'auto' })
        setPos(target)
        requestAnimationFrame(() => requestAnimationFrame(() => setStill(false)))
      }, 140)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => { track.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); window.clearTimeout(settle) }
  }, [])

  const running = onScreen && !tabHidden && !held && !paused && !reduced

  return (
    <section
      id="tools"
      ref={sectionRef}
      className={s.slider}
      aria-roledescription="carousel"
      aria-label="Earnn tools"
      onPointerEnter={e => { if (e.pointerType === 'mouse') setHeld(true) }}
      onPointerLeave={() => setHeld(false)}
      onTouchStart={() => setHeld(true)}
      onTouchEnd={() => setHeld(false)}
      onFocus={e => { if (e.target.matches(':focus-visible')) setHeld(true) }}
      onBlur={() => setHeld(false)}
    >
      <div className={`${s.sliderTrack} ${still ? s.sliderStill : ''}`} ref={trackRef}>
        {SLIDES.map((tool, i) => {
          const repeat = i === 0 || i === n + 1
          return (
            <article
              key={`${tool.key}-${i}`}
              className={`${s.slide} ${i === pos ? s.slideOn : ''} ${tool.image ? '' : s.slideChat}`}
              style={{ ['--accent' as string]: tool.accent }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${realIndex(i) + 1} of ${n}: ${tool.name}`}
              {...(repeat ? { 'aria-hidden': true, inert: true } : {})}
            >
              {tool.image && (
                <img
                  className={s.slidePhoto}
                  src={tool.image.src}
                  srcSet={`${tool.image.src.replace('.webp', '-800.webp')} 800w, ${tool.image.src} 1200w`}
                  sizes="(max-width: 820px) 84vw, 1100px"
                  alt=""
                  loading={i <= 2 || repeat ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{ objectPosition: `${tool.image.fx * 100}% ${tool.image.fy * 100}%` }}
                />
              )}
              <div className={s.slideVeil} aria-hidden />
              {tool.visual === 'chat' && (
                <div className={s.slideChatPreview} aria-hidden>
                  <div className={s.bubbleUser}>Which card should I use on Amazon?</div>
                  <div className={s.bubbleEarnie}><span>e</span>Happy to help — tell me how you shop.</div>
                </div>
              )}
              <div className={s.slideBody}>
                <span className={s.slideLabel}><i className={`ti ${tool.icon}`} aria-hidden />{tool.name}</span>
                <h2>{tool.headline}</h2>
                <p>{tool.description}</p>
                <Link href={tool.route} className="btn-primary">{tool.cta} <i className="ti ti-arrow-right" aria-hidden /></Link>
              </div>
            </article>
          )
        })}
      </div>

      <div className={s.sliderBar}>
        <ol className={s.sliderDots}>
          {TOOLS.map((tool, i) => (
            <li key={tool.key}>
              <button type="button" className={`${s.dot} ${i === current ? s.dotOn : ''}`} aria-label={`Show ${tool.name}`} aria-current={i === current} onClick={() => goTo(i + 1)}>
                <span className={s.dotBar} aria-hidden>
                  {i < current && <i className={s.dotDone} />}
                  {i === current && (
                    <i
                      key={pos}
                      className={s.dotFill}
                      style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running ? 'running' : 'paused', animationName: reduced ? 'none' : undefined }}
                      onAnimationEnd={next}
                    />
                  )}
                </span>
                <span className={s.dotName}>{tool.name}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className={s.sliderCtl}>
          <span className={s.counter} aria-live="off">{String(current + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          <button type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(p => !p)}>
            <i className={`ti ${paused ? 'ti-player-play' : 'ti-player-pause'}`} aria-hidden />
          </button>
          <button type="button" aria-label="Previous tool" onClick={() => goTo(pos - 1)}><i className="ti ti-arrow-left" aria-hidden /></button>
          <button type="button" aria-label="Next tool" onClick={next}><i className="ti ti-arrow-right" aria-hidden /></button>
        </div>
      </div>
    </section>
  )
}
