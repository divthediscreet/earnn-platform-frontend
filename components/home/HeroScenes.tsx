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
  ['ti-shopping-cart', 'Groceries', 'AED 2,200', 'enbd_20', '5% back', '+ AED 110'],
  ['ti-tools-kitchen-2', 'Dining', 'AED 1,500', 'adcb_03', '4% back', '+ AED 60'],
  ['ti-gas-station', 'Fuel', 'AED 1,300', 'dib_02', '3% back', '+ AED 39'],
] as const

// "How can I maximize my cashback?": AED 5,000 of monthly spending goes in, the right card takes each part, and the reward adds up
function PersonStory(_props: { question?: string }) {
  return (
    <div className={s.person}>
      <span className={`${s.coin} ${s.coinA}`}><i className="ti ti-coin" /></span>
      <span className={`${s.coin} ${s.coinB}`}><i className="ti ti-coin" /></span>
      <span className={`${s.spark} ${s.sparkA}`}><i className="ti ti-sparkles" /></span>
      <div className={s.spendTop}><i className="ti ti-wallet" /><span>Monthly spend</span><b>AED 5,000</b></div>
      <div className={s.rows}>
        {PERSON_ROWS.map(([icon, label, amount, id, rate, reward], index) => (
          <div key={label} className={s.row} style={{ '--i': index } as CSSProperties}>
            <span className={s.chip}><i className={`ti ${icon}`} /><span><em>{label}</em><small>{amount}</small></span></span>
            <span className={s.flow}><u /></span>
            <span className={s.cardWrap}>
              <CardImg id={id} className={s.mini} />
              <span className={s.rateBox}><b className={s.rate}>{rate}</b><small>{reward}</small></span>
            </span>
          </div>
        ))}
      </div>
      <div className={s.total}>
        <span className={s.totalIcon}><i className="ti ti-coins" /></span>
        <span className={s.totalText}><small>Total reward</small><b>AED 209</b></span>
        <span className={s.totalNote}>every<br />month</span>
      </div>
    </div>
  )
}

// "What card should I use at Lulu?": a card tapped on the payment terminal at the till
function SwipeStory(_props: { question?: string }) {
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
function BillsStory(_props: { question?: string }) {
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

// Three small cartoon pictures for the perks: a dumbbell, a cinema screen with popcorn and a ticket, a lounge recliner under a plane window
function GymArt() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden>
      <defs><linearGradient id="gymBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFE9A8" /><stop offset="1" stopColor="#F7C948" /></linearGradient></defs>
      <rect width="120" height="100" fill="url(#gymBg)" />
      <ellipse cx="60" cy="86" rx="40" ry="5" fill="#0A2860" opacity=".14" />
      <g className={s.lift}>
        <rect x="30" y="46" width="60" height="8" rx="4" fill="#5A6A85" />
        <rect x="19" y="32" width="11" height="36" rx="4" fill="#0A2860" />
        <rect x="10" y="39" width="9" height="22" rx="3" fill="#0E3785" />
        <rect x="90" y="32" width="11" height="36" rx="4" fill="#0A2860" />
        <rect x="101" y="39" width="9" height="22" rx="3" fill="#0E3785" />
        <rect x="23" y="35" width="3" height="12" rx="1.500" fill="#fff" opacity=".35" />
        <rect x="94" y="35" width="3" height="12" rx="1.500" fill="#fff" opacity=".35" />
      </g>
      <path d="M44 18l-4-8M60 16V6M76 18l4-8" stroke="#0A2860" strokeWidth="3" strokeLinecap="round" opacity=".45" />
    </svg>
  )
}

function CinemaArt() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden>
      <defs><linearGradient id="cinBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1A4FAD" /><stop offset="1" stopColor="#0A2860" /></linearGradient></defs>
      <rect width="120" height="100" fill="url(#cinBg)" />
      <rect x="14" y="9" width="92" height="46" rx="5" fill="#FFF4D0" />
      <path d="M14 14c0-3 2-5 5-5h10c-2 14-2 30 0 46H19c-3 0-5-2-5-5zM106 14c0-3-2-5-5-5H91c2 14 2 30 0 46h10c3 0 5-2 5-5z" fill="#C0392B" />
      <circle cx="60" cy="32" r="12" fill="#F7C948" />
      <path d="M56 26l11 6-11 6z" fill="#0A2860" />
      <g className={s.puff}>
        <circle cx="46" cy="60" r="6" fill="#FFF8E1" /><circle cx="56" cy="56" r="7" fill="#FFF8E1" /><circle cx="67" cy="58" r="6.500" fill="#FFF8E1" /><circle cx="75" cy="62" r="5" fill="#FFF8E1" />
      </g>
      <path d="M40 63h40l-5 31H45z" fill="#fff" />
      <path d="M46 63l2 31h-3zM54 63l1 31h-4zM66 63l-1 31h4zM74 63l-3 31h-3z" fill="#C0392B" />
      <g transform="rotate(12 96 76)">
        <rect x="84" y="62" width="26" height="28" rx="4" fill="#F7C948" />
        <circle cx="84" cy="76" r="4" fill="#0A2860" />
        <path d="M91 70h13M91 76h13M91 82h9" stroke="#0A2860" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      </g>
    </svg>
  )
}

function LoungeArt() {
  return (
    <svg viewBox="0 0 120 100" aria-hidden>
      <defs><linearGradient id="lngBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFD8FB" /><stop offset="1" stopColor="#DCE9FE" /></linearGradient></defs>
      <rect width="120" height="100" fill="url(#lngBg)" />
      <rect x="14" y="8" width="92" height="50" rx="8" fill="#9CC2F5" stroke="#fff" strokeWidth="4" />
      <ellipse cx="34" cy="44" rx="14" ry="5" fill="#fff" opacity=".85" />
      <ellipse cx="86" cy="22" rx="10" ry="4" fill="#fff" opacity=".85" />
      <g className={s.fly}>
        <path d="M30 32h34l-6-9h5l10 9h8c3 0 4 3 0 3H62l-8 8h-5l4-8H30c-3 0-3-3 0-3z" fill="#0A2860" />
      </g>
      <ellipse cx="60" cy="92" rx="38" ry="4" fill="#0A2860" opacity=".12" />
      <rect x="44" y="46" width="32" height="34" rx="12" fill="#1A4FAD" />
      <rect x="32" y="62" width="10" height="22" rx="5" fill="#0E3785" />
      <rect x="78" y="62" width="10" height="22" rx="5" fill="#0E3785" />
      <rect x="36" y="68" width="48" height="14" rx="7" fill="#2A63CC" />
      <rect x="80" y="76" width="26" height="8" rx="4" fill="#0E3785" transform="rotate(-8 80 80)" />
      <path d="M46 82v8M74 82v8" stroke="#0A2860" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 54h16" stroke="#F7C948" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

// "Do any of my three cards give me free gym access?": she wonders, the matching card appears with the perks it carries
function PerksStory({ question }: { question?: string }) {
  return (
    <div className={s.perks}>
      <div className={s.mind}>
        <i className="ti ti-search" />
        <span>{question}</span>
        <span className={s.dotA} /><span className={s.dotB} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.girl} src="/home/hero-perks-girl.png" alt="" width={432} height={669} />
      <div className={s.match}>
        <span className={s.matchTag}>Here’s your match <i className="ti ti-sparkles" /></span>
        <CardImg id="fab_06" className={s.perkCard} />
      </div>
      <div className={s.perkRow}>
        <span className={`${s.perkTile} ${s.perkTileOn}`} style={{ '--i': 0 } as CSSProperties}><GymArt /><em><i className="ti ti-check" /></em></span>
        <span className={s.perkTile} style={{ '--i': 1 } as CSSProperties}><CinemaArt /></span>
        <span className={s.perkTile} style={{ '--i': 2 } as CSSProperties}><LoungeArt /></span>
      </div>
    </div>
  )
}

// "I spend AED 120,000 a year...": the card turns spending into miles that fly to a business class seat
function TripStory(_props: { question?: string }) {
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
