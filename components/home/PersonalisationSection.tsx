'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import p from './Journeys.module.css'

// Three different ways Earnn helps, each with its own picture and a direct link into the matching tool.
// No reward amounts and no promised flights: the figures shown are the example spend, not a result.
const COLUMNS = [
  {
    key: 'everyday',
    tone: 'blue',
    top: { big: 'AED 15K', small: '/ month' },
    chips: [
      { label: 'Dining', icon: 'ti-tools-kitchen-2' },
      { label: 'Shopping', icon: 'ti-shopping-bag' },
      { label: 'Travel', icon: 'ti-plane' },
    ],
    title: 'Your best wallet',
    text: 'Find the right combination of cards for your monthly spending.',
    cta: 'Find my cards',
    href: '/analyse',
  },
  {
    key: 'big',
    tone: 'gold',
    top: { big: 'AED 50K', small: '/ School fees' },
    chips: [
      { label: 'School fees', icon: 'ti-school' },
      { label: 'Insurance', icon: 'ti-shield-check' },
      { label: 'Travel', icon: 'ti-plane' },
    ],
    title: 'Make big spending count',
    text: 'Plan large payments and discover which cards could reward you most.',
    cta: 'Plan big spending',
    href: '/bulk-spend-miles',
  },
  {
    key: 'travel',
    tone: 'sky',
    top: { big: 'Your next flight', small: 'Powered by everyday spending' },
    chips: [
      { label: 'Spending', icon: 'ti-credit-card' },
      { label: 'Miles', icon: 'ti-medal' },
      { label: 'Travel', icon: 'ti-plane-departure' },
    ],
    title: 'Turn spending into flights',
    text: 'Let Earnn plan how your spending could get you closer to your next flight.',
    cta: 'Plan my flight',
    href: '/trip-planner',
  },
] as const

/** Column 1: a fanned stack of premium cards. */
function CardStack() {
  return (
    <div className={`${p.art} ${p.stack}`} aria-hidden>
      {[1, 2, 3].map(n => (
        <img key={n} src={`/images/home/stack-${n}.webp`} width={480} height={300} alt="" loading="lazy" decoding="async" />
      ))}
    </div>
  )
}

/** Column 2: a school-fee invoice, a term calendar and a card, drawn in CSS so it looks different from the card photos. */
function InvoiceArt() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const due = new Set([3, 17, 24])
  return (
    <div className={`${p.art} ${p.invoiceArt}`} aria-hidden>
      <div className={p.calendar}>
        <b>Term fees</b>
        <div>{days.map(d => <i key={d} className={due.has(d) ? p.due : ''} />)}</div>
      </div>
      <div className={p.invoice}>
        <span className={p.invoiceHead}><i className="ti ti-school" /> School fees</span>
        <span className={p.line} /><span className={`${p.line} ${p.short}`} />
        <span className={p.invoiceAmount}>AED 50,000</span>
        <span className={p.paid}><i className="ti ti-circle-check-filled" /> Planned</span>
      </div>
      <div className={p.miniCard}><em /></div>
    </div>
  )
}

/** Column 3: the business-class cabin. */
function CabinArt() {
  return (
    <div className={`${p.art} ${p.cabin}`}>
      <img
        src="/images/home/outcome-flight-cabin.webp"
        width={830}
        height={368}
        alt="Inside a business-class cabin: a window with a soft city view, a glass of champagne and a meal"
        loading="lazy"
        decoding="async"
      />
      <span className={p.cabinBadge} aria-hidden><i className="ti ti-plane" /></span>
    </div>
  )
}

export default function PersonalisationSection() {
  const ref = useRef<HTMLUListElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { const t = setTimeout(() => setSeen(true), 0); return () => clearTimeout(t) }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setSeen(true); io.disconnect() }
    }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className={p.section} aria-labelledby="personal-title">
      <div className={p.inner}>
        <div className={p.head}>
          <h2 id="personal-title">Your money. Your goals. Your Earnn.</h2>
          <p>Every expense is an opportunity. Earnn helps you make the most of it.</p>
        </div>

        <ul ref={ref} className={`${p.grid} ${seen ? p.seen : ''}`}>
          {COLUMNS.map((c, i) => (
            <li key={c.key} className={`${p.col} ${p[c.tone]}`} style={{ ['--i' as string]: i }}>
              <div className={p.top}>
                <strong className={c.key === 'travel' ? p.topTitle : ''}>{c.top.big}</strong>
                <span>{c.top.small}</span>
              </div>
              <ul className={p.chips}>
                {c.chips.map(x => <li key={x.label}><i className={`ti ${x.icon}`} aria-hidden />{x.label}</li>)}
              </ul>

              {c.key === 'everyday' && <CardStack />}
              {c.key === 'big' && <InvoiceArt />}
              {c.key === 'travel' && <CabinArt />}

              <div className={p.outcome}>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </div>
              <Link href={c.href} className={`btn-primary ${p.cta}`}>{c.cta} <i className="ti ti-arrow-right" aria-hidden /></Link>
            </li>
          ))}
        </ul>

        <p className={p.statement}>
          Earnn doesn&rsquo;t find the best card.<br />
          It finds <span>what&rsquo;s best for you.</span>
        </p>
      </div>
    </section>
  )
}
