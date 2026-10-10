'use client'

// "Reward gap" popup, carried over from the old Analyse page (app/analyse-old): after the analysis it shows how much
// cashback the user's current card misses against the best wallet, before they continue to the result page.

import React from 'react'
import type { SpendGroup, Wallet } from '@/lib/wallet-simulator/api'

export type GapData = {
  monthlyDiff:    number
  annualDiff:     number
  currentMonthly: number
  isWinning:      boolean
  categoryGaps:   { label: string; current: number; diff: number }[]
  spendNumbers:   Record<string, number>
}

/** Gap between the best wallet and the user's current card on the same spend (reward figures come straight from the backend). */
export function buildGapData(best: Wallet, current: Wallet, groups: SpendGroup[]): GapData {
  const labels = new Map(groups.map(g => [g.group, g.label]))
  const sum = (w: Wallet) => {
    const m = new Map<string, number>()
    for (const l of w.allocation) { const g = l.group ?? 'miscellaneous'; m.set(g, (m.get(g) ?? 0) + l.monthly_reward_aed) }
    return m
  }
  const bestBy = sum(best), curBy = sum(current)
  const categoryGaps = [...bestBy.entries()]
    .map(([g, amt]) => ({ label: labels.get(g) ?? g, current: Math.round(curBy.get(g) ?? 0), diff: Math.round(amt - (curBy.get(g) ?? 0)) }))
    .filter(g => g.diff > 0 || g.current > 0)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 4)
  const monthlyDiff = best.monthly_reward_aed - current.monthly_reward_aed
  return {
    monthlyDiff, annualDiff: monthlyDiff * 12, currentMonthly: current.monthly_reward_aed, isWinning: monthlyDiff <= 0, categoryGaps,
    spendNumbers: Object.fromEntries(groups.map(g => [g.group, g.monthly_spend_aed])),
  }
}

// the simulator's spend groups -> the message keys below
const WITTY_ALIAS: Record<string, string> = { dineout: 'dining', food_delivery: 'dining', grocery_store: 'grocery', grocery_online: 'grocery', taxi: 'transport' }

function getWittyMessage(spend: Record<string, number>, annualLoss: number): { emoji: string; line1: string; line2: string } {
  const total = Object.values(spend).reduce((s, v) => s + v, 0)
  if (total === 0) return { emoji: '💸', line1: 'Your wallet has been busy.', line2: `And silently losing AED ${Math.round(annualLoss).toLocaleString('en-AE')} a year.` }

  const top = Object.entries(spend)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0]

  const pct = top ? (top[1] / total) * 100 : 0
  const cat = top?.[0] || ''

  const msgs: Record<string, { emoji: string; wittyLines: [string, string]; line2: string }> = {
    dining:        { emoji: '🍽️', wittyLines: ["Your kitchen gets a lot of nights off. 🍽️", "Dine in, dine out, order in… mostly the last two? 🍔"], line2: "Dining is where you're missing the most rewards." },
    grocery:       { emoji: '🛒', wittyLines: ["That's one seriously stocked fridge. 🛒", "Your grocery cart has been getting a workout. 🥑"], line2: "Grocery is where you're missing the most rewards." },
    travel:        { emoji: '✈️', wittyLines: ["Your passport has been busy. ✈️", "Your suitcase barely gets time to unpack. 🧳"], line2: "Travel is where you're missing the most rewards." },
    fuel:          { emoji: '⛽', wittyLines: ["Your car definitely gets out a lot. ⛽", "Are you in sales, or just memorising the UAE road map? 🚗"], line2: "Fuel is where you're missing the most rewards." },
    online:        { emoji: '📦', wittyLines: ["Your delivery driver probably knows you by now. 📦", "Your delivery guy deserves a loyalty card. 📦"], line2: "Online shopping is where you're missing the most rewards." },
    international: { emoji: '🌍', wittyLines: ["Your wallet has been travelling too. 🌍", "AED, USD, EUR… your card has been around. 💱"], line2: "International spend is where you're missing the most rewards." },
    entertainment: { emoji: '🎬', wittyLines: ["Staying in clearly isn't your thing. 🎬", "Your weekends seem pretty well booked. 🍿"], line2: "Entertainment is where you're missing the most rewards." },
    retail:        { emoji: '🛍️', wittyLines: ["Shopping might actually be your cardio. 🛍️", "Your wardrobe has been getting some serious attention. 👕"], line2: "Retail shopping is where you're missing the most rewards." },
    telecom:       { emoji: '📱', wittyLines: ["You definitely like staying connected. 📱", "Etisalat and du must love having you around. 📶"], line2: "Telecom is where you're missing the most rewards." },
    transport:     { emoji: '🚕', wittyLines: ["You've been keeping Careem busy. 🚕", "Someone's spending a lot of time in the back seat. 🚗"], line2: "Transport is where you're missing the most rewards." },
    utility:       { emoji: '❄️', wittyLines: ["That AC isn't taking any days off. ❄️", "DEWA must really like having you as a customer. 💡"], line2: "Utilities are where you're missing the most rewards." },
    education:     { emoji: '🎓', wittyLines: ["That's a serious investment in brainpower. 🎓", "Someone's taking education very seriously. 📚"], line2: "Education is where you're missing the most rewards." },
    miscellaneous: { emoji: '💳', wittyLines: ["A little here, a little there… it adds up. 💳", "A bit of this. A bit of that. A lot altogether. 💳"], line2: "Everyday spending is where you're missing the most rewards." },
  }

  const msg = msgs[WITTY_ALIAS[cat] ?? cat]
  if (!msg) return { emoji: '💸', line1: 'Interesting spending pattern.', line2: "Your card has no idea how to reward it." }
  return { emoji: msg.emoji, line1: msg.wittyLines[Math.floor(Math.random() * msg.wittyLines.length)], line2: msg.line2 }
}

export function ComparisonPopup({ data, onContinue }: {
  data: GapData
  onContinue: () => void
}) {
  const monthly = Math.round(Math.abs(data.monthlyDiff))
  const annual  = Math.round(Math.abs(data.annualDiff))
  const witty   = getWittyMessage(data.spendNumbers, annual)
  const currentEarns = Math.round(data.currentMonthly)
  const potential    = currentEarns + monthly
  const fillPct      = potential > 0 ? Math.round((currentEarns / potential) * 100) : 0
  const isGoodCard   = data.isWinning || monthly < 100

  // Contextual annual-loss tagline based on AED value
  const annualTagline = (() => {
    if (annual < 1200)  return null  // handled separately
    if (annual < 2400)  return "That's a new outfit you keep scrolling past every month."
    if (annual < 4800)  return "That's an iPhone you could be holding right now."
    if (annual < 7200)  return "That's a flight back home to see your parents. Every year."
    if (annual < 10000) return "That's a proper holiday — flights, hotel, a few good meals."
    if (annual < 15000) return "That's a business class seat going to waste."
    return "That's a car down payment. Walking out the door annually."
  })()

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(7,17,43,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onContinue}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '95vh', overflow: 'hidden', borderRadius: 20, background: '#f0f9fa', position: 'relative', animation: 'cmp-fadein 0.5s 2s ease both', opacity: 0, animationFillMode: 'forwards', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
      <style>{`
        @keyframes cmp-worry { 0%,100%{transform:rotate(0) translateX(0)} 15%{transform:rotate(-1.5deg) translateX(-2px)} 40%{transform:rotate(1deg) translateX(1px)} 60%{transform:rotate(-2deg) translateX(-1px)} 80%{transform:rotate(1.5deg) translateX(2px)} }
        @keyframes cmp-armL  { 0%,100%{transform:rotate(-40deg)} 50%{transform:rotate(-58deg)} }
        @keyframes cmp-armR  { 0%,100%{transform:rotate(40deg)}  50%{transform:rotate(58deg)} }
        @keyframes cmp-sweat { 0%,50%{transform:translateY(0);opacity:1} 100%{transform:translateY(14px);opacity:0} }
        @keyframes cmp-brow  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes cmp-fly1  { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-62px,-32px) scale(.3);opacity:0} }
        @keyframes cmp-fly2  { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-52px,22px) scale(.25);opacity:0} }
        @keyframes cmp-fly3  { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-78px,-8px) scale(.35);opacity:0} }
        @keyframes cmp-fly4  { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(-42px,-58px) scale(.3);opacity:0} }
        @keyframes cmp-note1 { 0%{transform:translate(0,0) rotate(0) scale(1);opacity:1} 100%{transform:translate(-82px,-28px) rotate(-20deg) scale(.38);opacity:0} }
        @keyframes cmp-note2 { 0%{transform:translate(0,0) rotate(0) scale(1);opacity:1} 100%{transform:translate(-72px,32px) rotate(14deg) scale(.32);opacity:0} }
        @keyframes cmp-note3 { 0%{transform:translate(0,0) rotate(0) scale(1);opacity:1} 100%{transform:translate(-92px,-48px) rotate(-8deg) scale(.44);opacity:0} }
        @keyframes cmp-fadein{ from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cmp-boxin { from{opacity:0;transform:translateY(20px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* ── HERO: teal + animated worried man ── */}
      <div style={{ background: '#0e7490', padding: '18px 18px 36px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>

        {/* Cartoon man */}
        <div style={{ flexShrink: 0, width: 96, height: 112 }}>
          <svg width="96" height="112" viewBox="0 0 118 138" overflow="visible">
            {/* AED banknotes flying left */}
            <g style={{ animation: 'cmp-note1 1.6s ease-out infinite' }}>
              <rect x="54" y="42" width="30" height="17" rx="3" fill="#4ade80" opacity=".9"/>
              <rect x="56" y="45" width="26" height="11" rx="1" fill="#16a34a" opacity=".35"/>
              <text x="69" y="55" fontSize="6" fill="#fff" textAnchor="middle" fontWeight="bold">AED</text>
            </g>
            <g style={{ animation: 'cmp-note2 1.6s ease-out .5s infinite' }}>
              <rect x="50" y="65" width="27" height="15" rx="3" fill="#34d399" opacity=".85"/>
              <text x="64" y="76" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">AED</text>
            </g>
            <g style={{ animation: 'cmp-note3 1.6s ease-out 1s infinite' }}>
              <rect x="57" y="30" width="34" height="18" rx="3" fill="#6ee7b7" opacity=".8"/>
              <text x="74" y="42" fontSize="6" fill="#065f46" textAnchor="middle" fontWeight="bold">AED</text>
            </g>
            {/* Gold coins */}
            <circle cx="66" cy="48" r="8" fill="#fbbf24" style={{ animation: 'cmp-fly1 1.6s ease-out .2s infinite' }}/>
            <circle cx="58" cy="63" r="6" fill="#f59e0b" style={{ animation: 'cmp-fly2 1.6s ease-out .6s infinite' }}/>
            <circle cx="68" cy="68" r="7" fill="#fbbf24" style={{ animation: 'cmp-fly3 1.6s ease-out 1s infinite' }}/>
            <circle cx="63" cy="40" r="5" fill="#fcd34d" style={{ animation: 'cmp-fly4 1.6s ease-out .4s infinite' }}/>

            {/* Man body — shaking */}
            <g style={{ animation: 'cmp-worry .5s ease-in-out infinite', transformOrigin: '82px 72px' }}>
              {/* Legs */}
              <rect x="70" y="114" width="12" height="24" rx="5" fill="#1e3a5f"/>
              <rect x="86" y="110" width="12" height="24" rx="5" fill="#1e3a5f" transform="rotate(6 92 122)"/>
              <ellipse cx="76" cy="138" rx="10" ry="4" fill="#2d1b09"/>
              <ellipse cx="94" cy="133" rx="10" ry="4" fill="#2d1b09" transform="rotate(6 94 133)"/>
              {/* Shirt */}
              <rect x="65" y="84" width="38" height="34" rx="7" fill="#f5f0e0"/>
              <path d="M 80 84 L 77 104 L 84 112 L 91 104 L 88 84 Z" fill="#1e3a5f"/>
              {/* Left arm raised */}
              <g style={{ animation: 'cmp-armL .8s ease-in-out infinite', transformOrigin: '65px 88px' }}>
                <rect x="42" y="82" width="24" height="10" rx="5" fill="#fcd7a1" transform="rotate(-42 65 88)"/>
                <circle cx="43" cy="74" r="6" fill="#fcd7a1"/>
              </g>
              {/* Right arm raised */}
              <g style={{ animation: 'cmp-armR .8s ease-in-out .2s infinite', transformOrigin: '103px 88px' }}>
                <rect x="103" y="82" width="24" height="10" rx="5" fill="#fcd7a1" transform="rotate(42 103 88)"/>
                <circle cx="124" cy="74" r="6" fill="#fcd7a1"/>
              </g>
              {/* Head */}
              <circle cx="84" cy="60" r="28" fill="#fcd7a1"/>
              {/* Hair */}
              <path d="M 60 50 Q 64 28 84 26 Q 104 28 108 50 Q 99 36 84 34 Q 69 36 60 50" fill="#6b3f1f"/>
              <rect x="58" y="45" width="6" height="9" rx="3" fill="#6b3f1f"/>
              <rect x="108" y="45" width="6" height="9" rx="3" fill="#6b3f1f"/>
              {/* Worried eyebrows */}
              <g style={{ animation: 'cmp-brow .8s ease-in-out infinite' }}>
                <path d="M 67 42 Q 73 36 79 41" stroke="#5d3a1a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M 89 41 Q 95 36 101 42" stroke="#5d3a1a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </g>
              {/* Wide eyes */}
              <ellipse cx="75" cy="56" rx="8" ry="9" fill="white"/>
              <ellipse cx="93" cy="56" rx="8" ry="9" fill="white"/>
              <circle cx="77" cy="58" r="4.5" fill="#1c1917"/>
              <circle cx="95" cy="58" r="4.5" fill="#1c1917"/>
              <circle cx="79" cy="56" r="1.8" fill="white"/>
              <circle cx="97" cy="56" r="1.8" fill="white"/>
              {/* Worried mouth */}
              <path d="M 73 72 Q 79 67 84 70 Q 89 67 95 72" stroke="#5d3a1a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              {/* Sweat */}
              <g style={{ animation: 'cmp-sweat 1.2s ease-in infinite' }}>
                <path d="M 109 42 Q 111 48 109 54 Q 107 48 109 42" fill="#7dd3fc"/>
              </g>
              <g style={{ animation: 'cmp-sweat 1.2s ease-in .5s infinite' }}>
                <path d="M 60 50 Q 62 56 60 62 Q 58 56 60 50" fill="#7dd3fc"/>
              </g>
            </g>
          </svg>
        </div>

        {/* Hook text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,.15)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,.75)', letterSpacing: '.08em', marginBottom: 10 }}>
            💸 reward gap
          </div>
          <div style={{ fontSize: 'clamp(17px,4vw,22px)', fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 8, animation: 'cmp-fadein .4s ease both' }}>
            {witty.line1}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)', lineHeight: 1.5, animation: 'cmp-fadein .4s .1s ease both' }}>
            {witty.line2}
          </div>
        </div>
      </div>

      {/* ── GOOD CARD: no numbers, no breakdown ── */}
      {isGoodCard ? (
        <div style={{ padding: '24px 20px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👏</div>
          <div style={{ fontSize: 19, fontWeight: 700, color: '#0e7490', marginBottom: 8 }}>
            You&apos;re already using a good card.
          </div>
          <div style={{ fontSize: 13, color: '#5A6A85', lineHeight: 1.6, marginBottom: 24 }}>
            You&apos;re not losing much — but there might be a card that fits your spending even better. See all your options below.
          </div>
          <button onClick={onContinue} style={{ width: '100%', padding: '13px', background: '#0e7490', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Show me all options →
          </button>
        </div>
      ) : (
        <>
          {/* ── LOSING BOX ── */}
          <div style={{ margin: '-18px 14px 0', background: '#fff', borderRadius: 12, border: '1.5px solid #fcd34d', padding: '14px 16px', textAlign: 'center', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '.14em', color: '#b45309', marginBottom: 4, fontWeight: 600 }}>EVERY MONTH YOU LOSE</div>
            <div style={{ fontSize: 'clamp(44px,11vw,68px)', fontWeight: 800, color: '#ea580c', lineHeight: 1, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>
              {monthly.toLocaleString('en-AE')}
            </div>
            <div style={{ fontSize: 16, color: '#d97706', marginTop: 2, fontWeight: 700 }}>AED</div>
            {annualTagline && (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
                AED {annual.toLocaleString('en-AE')}/year — {annualTagline}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 6, background: '#fef3c7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${fillPct}%`, background: '#ea580c', borderRadius: 3 }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>Your card: AED {currentEarns}/mo</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>Potential: AED {potential}/mo</span>
              </div>
            </div>
          </div>

          {/* ── BREAKDOWN ── */}
          {data.categoryGaps.filter(g => g.diff > 0 || g.current > 0).length > 0 && (
            <div style={{ margin: '10px 14px 0', background: '#fffbf0', border: '0.5px solid #fcd34d', borderRadius: 10, padding: '10px 14px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#b45309', letterSpacing: '.06em' }}>WHERE YOU&apos;RE MISSING REWARDS AGAINST CURRENT CARD</span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>vs what&apos;s possible</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px 64px', borderTop: '0.5px solid #fcd34d' }}>
                {['Category', 'You earn', 'Gap'].map((h, i) => (
                  <span key={h} style={{ fontSize: 10, color: '#9ca3af', padding: '5px 0 4px', borderBottom: '0.5px solid #fef3c7', textAlign: i > 0 ? 'right' : 'left' }}>{h}</span>
                ))}
                {data.categoryGaps.filter(g => g.diff > 0 || g.current > 0).map((g, i, arr) => (
                  <React.Fragment key={g.label}>
                    <span style={{ fontSize: 12, padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #fef3c7' : 'none', color: '#7c2d12' }}>{g.label}</span>
                    <span style={{ fontSize: 12, padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #fef3c7' : 'none', color: '#9ca3af', textAlign: 'right' }}>
                      {g.current > 0 ? `AED ${g.current}` : '—'}
                    </span>
                    <span style={{ fontSize: 12, padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #fef3c7' : 'none', color: '#16a34a', fontWeight: 600, textAlign: 'right' }}>
                      {g.diff > 0 ? `+${g.diff}` : '—'}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '0.5px solid #fcd34d' }}>
                <span style={{ fontSize: 11, color: '#b45309', fontWeight: 600 }}>Total monthly loss</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ea580c' }}>AED {monthly.toLocaleString('en-AE')} / mo</span>
              </div>
            </div>
          )}

          {/* ── CTA ── */}
          <div style={{ padding: '12px 14px 18px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#7c2d12', marginBottom: 10 }}>Really? 😲</div>
            <button onClick={onContinue} style={{ width: '100%', padding: '13px', background: '#ea580c', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Show me how to fix this →
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>Takes less than 30 seconds</div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
