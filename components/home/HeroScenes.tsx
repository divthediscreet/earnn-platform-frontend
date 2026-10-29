'use client'

import { useState, type CSSProperties } from 'react'
import { getCardImageUrl } from '@/lib/api'
import s from './HeroScenes.module.css'

// The five stories shown beside the home hero. Each one is a small picture of what is happening, not a screenshot:
// a person asks their question, a graphic shows the situation with real cards from the database, and Earnn answers.

export type Speaker = { skin: string; hair: string; shirt: string }

// A real card picture from the backend, or a plain card shape if the picture is missing
function CardImg({ id, className }: { id: string; className: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className={`${className} ${s.cardFallback}`} aria-hidden><i className="ti ti-credit-card" /></span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={getCardImageUrl(id)} alt="" onError={() => setFailed(true)} />
}

// A person who is speaking: head and shoulders, with sound waves that pulse beside them
export function SpeakerAvatar({ skin, hair, shirt }: Speaker) {
  return (
    <span className={s.speaker} aria-hidden>
      <svg viewBox="0 0 48 48">
        <path d="M5 47c2-11 9-15 19-15s17 4 19 15z" fill={shirt} />
        <circle cx="24" cy="21" r="11" fill={skin} />
        <path d="M12.5 21c-1-9 5-13.500 11.500-13.500S36.500 12 35.500 21c-3-5-7-6.500-11.500-6.500S15.500 16 12.500 21z" fill={hair} />
        <circle cx="19.500" cy="22" r="1.200" fill="#0D1828" />
        <circle cx="28.500" cy="22" r="1.200" fill="#0D1828" />
        <ellipse className={s.mouth} cx="24" cy="27.500" rx="2.600" ry="1.600" fill="#7A2E2E" />
      </svg>
      <i /><i />
    </span>
  )
}

const PERSON_ROWS = [
  ['ti-shopping-cart', 'Groceries', 'enbd_20', '5% back'],
  ['ti-tools-kitchen-2', 'Dining', 'adcb_03', '4% back'],
  ['ti-gas-station', 'Fuel', 'dib_02', '3% back'],
] as const

// "What are the best three cards for me?": spending in, the right card for each category out
function PersonStory() {
  return (
    <div className={s.rows}>
      {PERSON_ROWS.map(([icon, label, id, rate], index) => (
        <div key={label} className={s.row} style={{ '--i': index } as CSSProperties}>
          <span className={s.chip}><i className={`ti ${icon}`} />{label}</span>
          <span className={s.flow}><u /></span>
          <span className={s.cardWrap}><CardImg id={id} className={s.mini} /><b className={s.rate}>{rate}</b></span>
        </div>
      ))}
    </div>
  )
}

// "What card should I use at Lulu?": a card tapped on the payment terminal at the till
function SwipeStory() {
  return (
    <div className={s.swipe}>
      <div className={s.receipt}><i className="ti ti-building-store" /><span>Lulu Hypermarket</span><b>AED 420</b></div>
      <div className={s.terminal}>
        <div className={s.screen}><small>Total</small><b>AED 420</b><em><i className="ti ti-circle-check" /> Best card · 5% back</em></div>
        <span className={s.keys} />
      </div>
      <span className={s.waves}><i /><i /><i /></span>
      <CardImg id="enbd_20" className={s.tapCard} />
    </div>
  )
}

// "I have to pay my child's school fees": the bill, and the card that earns on it
function BillsStory() {
  return (
    <div className={s.bills}>
      <div className={s.invoice}>
        <header><i className="ti ti-school" /> School fees</header>
        <small>Term 1 · due 1 Sep</small>
        <b>AED 30,000</b>
        <u /><u />
      </div>
      <span className={s.bonus}><i className="ti ti-gift" /> Welcome bonus · Eligible</span>
      <CardImg id="dib_02" className={s.payCard} />
    </div>
  )
}

// "Which card gives me rewards and gym access?": one card, with the perks it carries
function PerksStory() {
  return (
    <div className={s.perks}>
      <CardImg id="fab_06" className={s.perkCard} />
      <span className={`${s.perk} ${s.perkGym}`}><i className="ti ti-barbell" /> Gym access <em><i className="ti ti-check" /></em></span>
      <span className={`${s.perk} ${s.perkMovie}`}><i className="ti ti-movie" /> Cinema</span>
      <span className={`${s.perk} ${s.perkLounge}`}><i className="ti ti-armchair-2" /> Lounge</span>
    </div>
  )
}

// "I spend AED 120,000 a year...": the card turns spending into miles that fly to a business class seat
function TripStory() {
  return (
    <div className={s.trip}>
      <CardImg id="enbd_14" className={s.tripCard} />
      <svg className={s.arc} viewBox="0 0 240 140" aria-hidden>
        <path className={s.arcLine} d="M 78 112 C 92 30, 168 18, 200 60" />
        <path className={s.arcDots} d="M 78 112 C 92 30, 168 18, 200 60" />
        <g className={s.planeMark}>
          <path d="M 0 -7 L 9 0 L 0 7 L 2 0 Z" fill="#0A2860" />
          <animateMotion dur="3.2s" repeatCount="indefinite" rotate="auto" path="M 78 112 C 92 30, 168 18, 200 60" />
        </g>
      </svg>
      <div className={s.pass}>
        <header>Boarding pass</header>
        <div className={s.route}><b>DXB</b><i className="ti ti-plane" /><b>LHR</b></div>
        <small>Business class</small>
      </div>
    </div>
  )
}

export const STORIES = { person: PersonStory, swipe: SwipeStory, bills: BillsStory, perks: PerksStory, trip: TripStory } as const
export type StoryKey = keyof typeof STORIES
