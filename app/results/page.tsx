'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getOptimalWallet, fetchCardDetail, getCardImageUrl } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const RATE_PILLS = [
  { key: 'dining',    name: 'Dining',    icon: '🍽️' },
  { key: 'grocery',   name: 'Grocery',   icon: '🛒' },
  { key: 'travel',    name: 'Travel',    icon: '✈️' },
  { key: 'fuel',      name: 'Fuel',      icon: '⛽' },
  { key: 'online',    name: 'Online',    icon: '📦' },
  { key: 'retail',    name: 'Retail',    icon: '🛍️' },
  { key: 'utility',   name: 'Utility',   icon: '💡' },
  { key: 'all_spend', name: 'All Other', icon: '➕' },
]
const leftBars  = RATE_PILLS.slice(0, 4)
const rightBars = RATE_PILLS.slice(4)

const CAT_ICONS: Record<string, string> = {
  dining:'🍽️', grocery:'🛒', travel:'✈️', fuel:'⛽', online:'📦',
  retail:'🛍️', utility:'💡', entertainment:'🎬', international:'🌍',
  telecom:'📱', transport:'🚕', education:'📚', miscellaneous:'➕',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  const t = Math.max(0, Math.min(100, score)) / 100
  return `hsl(${Math.round(t * 142)}, 72%, ${28 + (1 - t) * 8}%)`
}
function fmtRate(r: number) { return r ? `${(r * 100).toFixed(1)}%` : '0%' }
function fmtScore(s: number) { return s.toFixed(1) }
function fmtAed(n: number) { return `AED ${Math.round(n).toLocaleString()}` }

// ─── Inline Tooltip ───────────────────────────────────────────────────────────
function InlineTooltip({ text }: { text: string }) {
  return (
    <span style={{
      position:'absolute', top:'110%', left:'50%', transform:'translateX(-50%)',
      background:'#0D1828', color:'#fff', fontSize:12, padding:'10px 14px',
      borderRadius:10, width:240, zIndex:300, pointerEvents:'none', whiteSpace:'normal', lineHeight:1.5,
    }}>{text}</span>
  )
}

// ─── Card Detail Popup ────────────────────────────────────────────────────────
function CardDetailPopup({
  cardId, cardName, cardEarnn, cardFee, prefetchedDetail, onClose,
}: {
  cardId: string; cardName: string; cardEarnn?: number; cardFee?: number
  prefetchedDetail?: any
  onClose: () => void
}) {
  const [detail, setDetail] = useState<any>(prefetchedDetail || null)
  const [loading, setLoading] = useState(!prefetchedDetail)

  useEffect(() => {
    if (prefetchedDetail) return  // already have it — no fetch needed
    fetchCardDetail(cardId).then(d => { setDetail(d); setLoading(false) }).catch(() => setLoading(false))
  }, [cardId, prefetchedDetail])

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:1100,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }} onClick={onClose}>
      <div style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:680, maxHeight:'85vh',
        overflow:'auto', padding:32, position:'relative',
      }} onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={onClose} style={{
          position:'absolute', top:16, right:16, background:'#EEF3FF', border:'none',
          borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:18, color:'#5A6A85',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
        }}>×</button>

        {/* Card header */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
          <img src={getCardImageUrl(cardId)} alt={cardName} width={108} height={66}
            onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            style={{ borderRadius:8, objectFit:'cover', boxShadow:'0 4px 16px rgba(14,55,133,0.2)' }} />
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:'#0D1828' }}>{cardName}</div>
            <div style={{ display:'flex', gap:16, marginTop:8 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#00A67E' }}>
                  {cardEarnn !== undefined ? fmtAed(cardEarnn) : '—'}
                </div>
                <div style={{ fontSize:11, color:'#5A6A85' }}>Annual Rewards</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color: (cardFee || 0) > 0 ? '#C0392B' : '#00A67E' }}>
                  {cardFee !== undefined ? (cardFee > 0 ? fmtAed(cardFee) : 'No Fee') : '—'}
                </div>
                <div style={{ fontSize:11, color:'#5A6A85' }}>Annual Fee</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detail columns */}
        {loading ? (
          <div style={{ textAlign:'center', padding:40, color:'#5A6A85' }}>Loading details…</div>
        ) : detail ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {[
              { title:'✅ Top Benefits',   items: detail.benefits || [] },
              { title:'🎯 Best For',        items: detail.best_for || [] },
              { title:'📋 Things To Note', items: detail.card_disclaimer || [] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0D1828', marginBottom:10 }}>{col.title}</div>
                {col.items.length === 0
                  ? <div style={{ fontSize:12, color:'#A0AFC0' }}>—</div>
                  : col.items.map((item: string, i: number) => (
                    <div key={i} style={{ fontSize:12, color:'#3D5068', marginBottom:6, lineHeight:1.5 }}>• {item}</div>
                  ))
                }
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:40, color:'#5A6A85' }}>No details available.</div>
        )}

        {/* View & Apply */}
        <div style={{ marginTop:28, textAlign:'center' }}>
          <button
            onClick={() => alert('🚀 Coming soon!')}
            style={{
              background:'#0E3785', color:'#fff', border:'none', borderRadius:10,
              padding:'12px 36px', fontSize:15, fontWeight:700, cursor:'pointer',
            }}
          >View &amp; Apply</button>
        </div>
      </div>
    </div>
  )
}

// ─── Other Combinations Popup ─────────────────────────────────────────────────
function OtherCombosPopup({
  nCards, combinations, cardNames, cardData, onCardClick, onClose,
}: {
  nCards: number
  combinations: any[]
  cardNames: Record<string, string>
  cardData: Record<string, any>
  onCardClick: (id: string, name: string) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }} onClick={onClose}>
      <div style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:760, maxHeight:'85vh',
        overflow:'auto', padding:32, position:'relative',
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{
          position:'absolute', top:16, right:16, background:'#EEF3FF', border:'none',
          borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:18, color:'#5A6A85',
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700,
        }}>×</button>

        <h2 style={{ fontSize:20, fontWeight:800, color:'#0D1828', margin:'0 0 4px' }}>
          Top {combinations.length} · {nCards}-Card Combinations
        </h2>
        <p style={{ color:'#5A6A85', fontSize:14, margin:'0 0 24px' }}>
          All ranked by Net Annual Value (rewards minus fees) for your spending profile.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {combinations.map((combo, i) => (
            <div key={i} style={{
              border: i === 0 ? '2px solid #0E3785' : '1px solid #D6E0F5',
              borderRadius:14, padding:'16px 20px',
              background: i === 0 ? '#F5F8FF' : '#fff',
            }}>
              {/* Top row: rank + stats */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontWeight:800, fontSize:15, color:'#0D1828' }}>
                  #{combo.rank} {i === 0 && <span style={{ marginLeft:8, background:'#0E3785', color:'#fff', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:100 }}>BEST</span>}
                </div>
                <div style={{ display:'flex', gap:20 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#00A67E' }}>{fmtAed(combo.gross_annual_aed)}</div>
                    <div style={{ fontSize:10, color:'#5A6A85' }}>Gross Rewards</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:800, color: combo.total_fee_aed > 0 ? '#C0392B' : '#00A67E' }}>
                      {combo.total_fee_aed > 0 ? fmtAed(combo.total_fee_aed) : 'No Fee'}
                    </div>
                    <div style={{ fontSize:10, color:'#5A6A85' }}>Total Fee</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0E3785' }}>{fmtAed(combo.net_annual_value_aed)}</div>
                    <div style={{ fontSize:10, color:'#5A6A85' }}>Net Value</div>
                  </div>
                </div>
              </div>

              {/* Cards row — fixed-width tiles so position never shifts with name length */}
              <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:0 }}>
                {combo.card_ids.map((id: string, ci: number) => {
                  const isLast = ci === combo.card_ids.length - 1
                  return (
                    <div key={id} style={{ display:'flex', alignItems:'center' }}>
                      <button
                        onClick={() => onCardClick(id, cardNames[id] || id)}
                        style={{
                          width:112, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                          background:'none', border:'1px solid #D6E0F5',
                          borderRadius:10, padding:'8px 8px', cursor:'pointer', margin:'4px',
                        }}
                      >
                        <img src={getCardImageUrl(id)} alt={cardNames[id] || id} width={64} height={39} loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
                          style={{ borderRadius:4, objectFit:'cover', boxShadow:'0 2px 8px rgba(14,55,133,0.15)' }} />
                        <span style={{
                          fontSize:10, fontWeight:600, color:'#0D1828', textAlign:'center',
                          lineHeight:1.35, width:'100%',
                          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                          overflow:'hidden',
                        }}>{cardNames[id] || id}</span>
                      </button>
                      {!isLast && (
                        <span style={{ color:'#5A6A85', fontWeight:700, fontSize:16, padding:'0 2px', flexShrink:0 }}>+</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Wallet Combo Card ────────────────────────────────────────────────────────
function WalletCombo({
  combo, index, cardNames, cardData, topCardNav, onCardClick, onSeeOthers,
}: {
  combo: any
  index: number
  cardNames: Record<string, string>
  cardData: Record<string, any>
  topCardNav: number
  onCardClick: (id: string, name: string) => void
  onSeeOthers: () => void
}) {
  const COLORS = ['#0E3785', '#00A67E', '#E07B1F', '#6B21A8']
  const color = COLORS[index] || '#5A6A85'

  // Fix incremental for 2-card wallet: vs best single card, not vs 0
  const incremental = combo.n_cards === 2
    ? combo.net_annual_value_aed - topCardNav
    : combo.incremental_vs_prev_aed

  // Recommendation text
  // Verdict applies to ALL wallet sizes using the incremental value
  type Verdict = { label: string; emoji: string; pillBg: string; pillColor: string; bg: string; border: string; textColor: string }
  const verdict: Verdict = (() => {
    if (incremental < 500) return {
      label: 'Not Recommended',
      emoji: '⚠️',
      pillBg: '#FEE2E2', pillColor: '#B91C1C',
      bg: '#FFF5F5', border: '#FECACA', textColor: '#B91C1C',
    }
    if (incremental <= 1200) return {
      label: 'Good to Have',
      emoji: '👍',
      pillBg: '#FEF3C7', pillColor: '#92400E',
      bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E',
    }
    return {
      label: 'Must Have',
      emoji: '🏆',
      pillBg: '#D1FAE5', pillColor: '#065F46',
      bg: '#F0FFF8', border: '#6EE7B7', textColor: '#065F46',
    }
  })()

  const recText = (() => {
    if (combo.n_cards === 2) {
      return incremental > 0
        ? `This 2-card pair earns you ${fmtAed(incremental)} more per year than your best single card. Each card targets different spend categories so together they cover more ground at higher rates.`
        : `This is the top 2-card combination for your spend. Together they maximise coverage across your spending categories.`
    }
    if (combo.n_cards === 3) {
      if (incremental < 500) {
        return `Adding a 3rd card only earns ${fmtAed(incremental)} more per year. The complexity of managing a 3rd card outweighs the reward gain. Stick with the 2-card wallet.`
      }
      if (incremental <= 1200) {
        return `Adding a 3rd card earns you ${fmtAed(incremental)} more per year (about AED ${Math.round(incremental / 12)}/month extra). Worth it if you don't mind managing one extra card — each card in this trio targets specific categories at the highest possible rate.`
      }
      return `Adding a 3rd card earns you ${fmtAed(incremental)} more per year — that's over AED ${Math.round(incremental / 12)}/month extra in rewards. A clear win: the 3rd card pays for itself multiple times over and meaningfully boosts your annual return.`
    }
    if (combo.n_cards === 4) {
      if (incremental < 500) {
        // Don't assume 3-card is the right fallback — it may also be not recommended
        return `A 4th card adds only ${fmtAed(incremental)} more per year. You've hit the point of diminishing returns — fewer cards give you better value with less complexity.`
      }
      if (incremental <= 1200) {
        return `A 4th card earns ${fmtAed(incremental)} more per year than the 3-card wallet (about AED ${Math.round(incremental / 12)}/month extra). A decent gain if you're comfortable managing 4 cards and using each one for its best category.`
      }
      return `A 4th card adds ${fmtAed(incremental)} more per year — more than AED ${Math.round(incremental / 12)}/month in additional rewards. If you're disciplined about routing each spend category to the right card, this wallet delivers maximum return.`
    }
    return ''
  })()

  return (
    <div style={{
      background:'#fff', borderRadius:18, position:'relative',
      border:`2px solid ${verdict.border}`,
      padding:'24px 28px',
      boxShadow: incremental > 1200 ? `0 6px 32px ${verdict.border}55` : 'none',
    }}>
      {/* See other combinations — flush top-right corner */}
      {(combo.top_combinations || []).length > 1 && (
        <button onClick={onSeeOthers} style={{
          position:'absolute', top:0, right:0,
          background:'#EEF3FF', border:'none', borderRadius:'0 18px 0 10px',
          padding:'6px 14px', fontSize:12, fontWeight:600, color:'#0E3785', cursor:'pointer',
        }}>
          See other combinations ↗
        </button>
      )}

      {/* Header — icon + title only */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ fontSize:26 }}>{['🥇','🥈','🥉','🏅'][index] || '💳'}</div>
        <div style={{ fontWeight:800, fontSize:17, color:'#0D1828' }}>
          {combo.n_cards}-Card Wallet
        </div>
      </div>

      {/* Card images row + verdict pill in the same row, pill centred with cards */}
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        {/* Cards */}
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:0, flex:1 }}>
          {combo.card_ids.map((id: string, ci: number) => {
            const isLast = ci === combo.card_ids.length - 1
            return (
              <div key={id} style={{ display:'flex', alignItems:'center' }}>
                <button
                  onClick={() => onCardClick(id, cardNames[id] || id)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                    background:'none', border:'1px solid #D6E0F5', borderRadius:12,
                    padding:'8px 12px', cursor:'pointer', margin:'4px',
                  }}
                >
                  <img src={getCardImageUrl(id)} alt={cardNames[id] || id} width={88} height={54} loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
                    style={{ borderRadius:6, objectFit:'cover', boxShadow:'0 3px 12px rgba(14,55,133,0.15)' }} />
                  <span style={{ fontSize:11, fontWeight:600, color:'#0D1828', maxWidth:100, textAlign:'center', lineHeight:1.3 }}>
                    {cardNames[id] || id}
                  </span>
                </button>
                {!isLast && (
                  <span style={{ fontWeight:800, fontSize:20, color:'#5A6A85', padding:'0 6px' }}>+</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Verdict pill — same row, vertically centred with card images */}
        <div style={{
          display:'flex', alignItems:'center', gap:8, flexShrink:0,
          background: verdict.pillBg, borderRadius:12, padding:'10px 16px',
          alignSelf:'center',
        }}>
          <span style={{ fontSize:18 }}>{verdict.emoji}</span>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            <span style={{ fontSize:13, fontWeight:800, color: verdict.pillColor, letterSpacing:'0.02em', lineHeight:1 }}>
              {verdict.label}
            </span>
            <span style={{ fontSize:11, color: verdict.pillColor, opacity:0.75, lineHeight:1 }}>
              get additional {fmtAed(incremental)}/yr
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Gross Rewards',    value: fmtAed(combo.gross_annual_aed),        color:'#00A67E' },
          { label:'Total Annual Fee', value: combo.total_fee_aed > 0 ? fmtAed(combo.total_fee_aed) : 'No Fee', color:'#C0392B' },
          { label:'Net Annual Value', value: fmtAed(combo.net_annual_value_aed),    color },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center', background:'#F8FAFF', borderRadius:10, padding:'12px 8px' }}>
            <div style={{ fontSize:18, fontWeight:800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#5A6A85', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Incremental value badge */}
      <div style={{
        background: incremental > 0 ? '#F0FFF8' : '#FFF8F0',
        border: `1px solid ${incremental > 0 ? '#A7F3D0' : '#FCD9A0'}`,
        borderRadius:10, padding:'10px 16px',
        display:'flex', alignItems:'center', gap:10, marginBottom:16,
      }}>
        <span style={{ fontSize:20 }}>{incremental > 0 ? '📈' : '⚖️'}</span>
        <div>
          <span style={{ fontWeight:700, fontSize:14, color: incremental > 0 ? '#065F46' : '#92400E' }}>
            {incremental > 0 ? `+${fmtAed(incremental)}` : fmtAed(incremental)} vs {combo.n_cards === 2 ? 'best single card' : `${combo.n_cards - 1}-card wallet`}
          </span>
          <div style={{ fontSize:12, color:'#5A6A85', marginTop:2 }}>
            {combo.n_cards === 2
              ? 'Extra you earn per year by adding a 2nd card'
              : `Extra you earn per year by adding card #${combo.n_cards}`}
          </div>
        </div>
      </div>

      {/* Recommendation text */}
      <div style={{
        background:'#F8FAFF', borderRadius:10, padding:'12px 16px',
        fontSize:13, color:'#3D5068', lineHeight:1.6,
        borderLeft:`3px solid ${verdict ? verdict.border : color}`,
      }}>
        💡 {recText}
      </div>
    </div>
  )
}

// ─── Card Tile (Tab 1) ────────────────────────────────────────────────────────
function CardTile({ card }: { card: any }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail]     = useState<any>(null)
  const [hoverScore, setHoverScore] = useState(false)
  const [hoverNav, setHoverNav]     = useState(false)
  const [hoverFee, setHoverFee]     = useState(false)
  const [hoverBar, setHoverBar]     = useState<string | null>(null)
  const [detailLoaded, setDetailLoaded] = useState(false)

  const rank    = card.card_ranking
  const rates   = card.category_effective_rates || {}
  const monthly = card.category_monthly_rewards  || {}

  function getRateForPill(key: string) { return key === 'all_spend' ? (rates['miscellaneous'] || 0) : (rates[key] || 0) }
  function getMonthlyForPill(key: string) { return key === 'all_spend' ? (monthly['miscellaneous'] || 0) : (monthly[key] || 0) }
  const maxRate = Math.max(...RATE_PILLS.map(p => getRateForPill(p.key))) || 1

  async function prefetchDetail() {
    if (detailLoaded || !card.earnn_card_id) return
    setDetailLoaded(true)
    try { const d = await fetchCardDetail(card.earnn_card_id); setDetail(d) } catch { /* ignore */ }
  }

  const isTop = rank === 1
  const rankStyle = rank === 1
    ? { bg:'linear-gradient(135deg,#B8860B,#FFD700)', color:'#fff', border:'2px solid #FFD700' }
    : rank <= 3
    ? { bg:'linear-gradient(135deg,#0E3785,#1A4FCC)', color:'#fff', border:'2px solid #0E3785' }
    : { bg:'#EEF3FF', color:'#0E3785', border:'2px solid #D6E0F5' }

  return (
    <div onMouseEnter={prefetchDetail} style={{
      background:'#fff', borderRadius:18, overflow:'visible',
      border: isTop ? '2px solid #0E3785' : '1.5px solid #D6E0F5',
      boxShadow: isTop ? '0 6px 32px rgba(14,55,133,0.13)' : '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 20px 0' }}>
        <div style={{
          width:36, height:36, borderRadius:'50%', flexShrink:0,
          background: rankStyle.bg, border: rankStyle.border, color: rankStyle.color,
          display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14,
        }}>#{rank}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:15, color:'#0D1828', lineHeight:1.25 }}>{card.card_name}</div>
          {card.bank_name && <div style={{ fontSize:12, color:'#5A6A85', marginTop:2 }}>{card.bank_name}</div>}
        </div>
        <div style={{ position:'relative', cursor:'default' }}
          onMouseEnter={() => setHoverScore(true)} onMouseLeave={() => setHoverScore(false)}>
          <div style={{
            background: scoreColor(card.earnn_score), color:'#fff',
            fontWeight:800, fontSize:14, padding:'6px 14px', borderRadius:20, whiteSpace:'nowrap',
          }}>{fmtScore(card.earnn_score)}</div>
          {hoverScore && <InlineTooltip text="earnn score is hyper-personalised, calculated based on your spending pattern." />}
        </div>
        <button onClick={() => {
          const t = document.createElement('div')
          t.textContent = '🚀 Coming soon!'
          Object.assign(t.style, { position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)',
            background:'#0D1828', color:'#fff', padding:'12px 24px', borderRadius:12,
            fontWeight:600, fontSize:15, zIndex:9999, pointerEvents:'none' })
          document.body.appendChild(t); setTimeout(() => t.remove(), 2200)
        }} style={{
          background:'#0E3785', color:'#fff', border:'none', borderRadius:8,
          padding:'7px 14px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0,
        }}>View &amp; Apply</button>
      </div>

      {/* Body */}
      <div style={{ display:'flex', alignItems:'center', gap:0, padding:'14px 20px 0' }}>
        {/* Card image */}
        <div style={{ flexShrink:0, padding:'0 12px 0 0', display:'flex', alignItems:'center' }}>
          <img src={getCardImageUrl(card.earnn_card_id)} alt={card.card_name} width={108} height={66} loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            style={{ borderRadius:8, objectFit:'cover', boxShadow:'0 4px 16px rgba(14,55,133,0.2)', display:'block' }} />
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'#D6E0F5', height:80, margin:'0 12px', flexShrink:0 }} />

        {/* Rate bars 2×4 */}
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px' }}>
          {[leftBars, rightBars].map((col, ci) =>
            col.map(pill => {
              const rate = getRateForPill(pill.key)
              const mon  = getMonthlyForPill(pill.key)
              const hKey = `${ci}-${pill.key}`
              return (
                <div key={pill.key} style={{ position:'relative', cursor:'default' }}
                  onMouseEnter={() => setHoverBar(hKey)} onMouseLeave={() => setHoverBar(null)}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#5A6A85', marginBottom:3 }}>
                    <span>{pill.icon} {pill.name}</span>
                    <span style={{ fontWeight:600, color:'#0D1828' }}>{fmtRate(rate)}</span>
                  </div>
                  <div style={{ height:5, background:'#EEF3FF', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(rate / maxRate) * 100}%`, background:'#8B2E2E', borderRadius:3 }} />
                  </div>
                  {hoverBar === hKey && (
                    <div style={{
                      position:'absolute', top:'110%', left:'50%', transform:'translateX(-50%)',
                      background:'#0D1828', color:'#fff', fontSize:12, padding:'8px 12px',
                      borderRadius:8, zIndex:300, whiteSpace:'nowrap', pointerEvents:'none',
                    }}>Monthly reward: AED {mon.toFixed(2)}</div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'#D6E0F5', height:80, margin:'0 16px', flexShrink:0 }} />

        {/* Earn Up To */}
        <div style={{ position:'relative', textAlign:'center', minWidth:110, cursor:'default' }}
          onMouseEnter={() => setHoverNav(true)} onMouseLeave={() => setHoverNav(false)}>
          <div style={{ fontSize:11, color:'#5A6A85', fontWeight:600, marginBottom:4 }}>EARN UP TO</div>
          <div style={{ fontSize:18, fontWeight:800, color:'#00A67E' }}>{fmtAed(card.expected_annual_return_aed)}</div>
          <div style={{ fontSize:11, color:'#5A6A85' }}>/yr</div>
          {hoverNav && <InlineTooltip text="Estimated annual rewards based on your spending, before the card's annual fee." />}
        </div>

        {/* Divider */}
        <div style={{ width:1, background:'#D6E0F5', height:80, margin:'0 16px', flexShrink:0 }} />

        {/* Effective Fee */}
        <div style={{ position:'relative', textAlign:'center', minWidth:110, cursor:'default' }}
          onMouseEnter={() => setHoverFee(true)} onMouseLeave={() => setHoverFee(false)}>
          <div style={{ fontSize:11, color:'#5A6A85', fontWeight:600, marginBottom:4 }}>EFFECTIVE FEE</div>
          <div style={{ fontSize:18, fontWeight:800, color: card.true_annual_fee_aed > 0 ? '#C0392B' : '#00A67E' }}>
            {card.true_annual_fee_aed > 0 ? fmtAed(card.true_annual_fee_aed) : 'No Fee'}
          </div>
          <div style={{ fontSize:11, color:'#5A6A85' }}>/yr</div>
          {hoverFee && <InlineTooltip text="Estimated annual fee for this card based on your spend." />}
        </div>
      </div>

      {/* Expand toggle */}
      <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 2px' }}>
        <button onClick={() => { setExpanded(e => !e); if (!detailLoaded) prefetchDetail() }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#5A6A85', fontSize:12, fontWeight:600 }}>
          {expanded ? 'HIDE DETAILS ▲' : 'MORE DETAILS ▼'}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{
          borderTop:'1px solid #EEF3FF', padding:'18px 20px 20px',
          display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20,
        }}>
          {[
            { title:'✅ Top Benefits',   items: detail?.benefits || [] },
            { title:'🎯 Best For',        items: detail?.best_for || [] },
            { title:'📋 Things To Note', items: detail?.card_disclaimer || [] },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontWeight:700, fontSize:13, color:'#0D1828', marginBottom:10 }}>{col.title}</div>
              {col.items.length === 0
                ? <div style={{ fontSize:12, color:'#A0AFC0' }}>Loading…</div>
                : col.items.map((item: string, i: number) => (
                  <div key={i} style={{ fontSize:12, color:'#3D5068', marginBottom:6, lineHeight:1.5 }}>• {item}</div>
                ))
              }
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult]           = useState<any>(null)
  const [activeTab, setActiveTab]     = useState<'ranking' | 'wallet'>('ranking')
  const [walletData, setWalletData]   = useState<any>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError]     = useState('')
  const [cardNames, setCardNames]         = useState<Record<string, string>>({})
  const [cardData, setCardData]           = useState<Record<string, any>>({})
  // Pre-fetched card detail cache: cardId → {benefits, best_for, card_disclaimer}
  const [detailCache, setDetailCache]     = useState<Record<string, any>>({})

  // Popups
  const [detailPopup, setDetailPopup] = useState<{ cardId: string; cardName: string; earnn?: number; fee?: number } | null>(null)
  const [comboPopup, setComboPopup]   = useState<{ nCards: number; combinations: any[] } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('earnn_result')
    if (!stored) { router.push('/analyse'); return }
    const parsed = JSON.parse(stored)
    setResult(parsed.data)
  }, [router])

  useEffect(() => {
    if (!result?.scored_cards) return
    const names: Record<string, string> = {}
    const data: Record<string, any>    = {}
    for (const c of result.scored_cards) {
      if (c.earnn_card_id) {
        names[c.earnn_card_id] = c.card_name
        data[c.earnn_card_id]  = c
      }
    }
    setCardNames(names)
    setCardData(data)
  }, [result])

  async function loadWallet() {
    if (walletData || walletLoading || !result?.user_spend) return
    setWalletLoading(true); setWalletError('')
    try {
      const d = await getOptimalWallet(result.user_spend)
      setWalletData(d)

      // Pre-fetch details for every unique card across all wallet combos — fire in parallel
      const allIds = new Set<string>()
      for (const combo of (d.wallets || [])) {
        for (const id of (combo.card_ids || [])) allIds.add(id)
        for (const tc of (combo.top_combinations || [])) {
          for (const id of (tc.card_ids || [])) allIds.add(id)
        }
      }
      const fetches = [...allIds].map(id =>
        fetchCardDetail(id)
          .then(detail => ({ id, detail }))
          .catch(() => null)
      )
      const results = await Promise.all(fetches)
      const cache: Record<string, any> = {}
      for (const r of results) { if (r) cache[r.id] = r.detail }
      setDetailCache(cache)
    }
    catch (e: any) { setWalletError(e.message || 'Failed to load wallet') }
    finally { setWalletLoading(false) }
  }

  function openCardDetail(cardId: string, cardName: string) {
    const cd = cardData[cardId]
    setDetailPopup({
      cardId, cardName,
      earnn:  cd?.expected_annual_return_aed,
      fee:    cd?.true_annual_fee_aed,
    })
  }

  if (!result) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⏳</div>
        <p style={{ color:'#5A6A85', fontSize:17 }}>Loading your results…</p>
      </div>
    </div>
  )

  const scoredCards: any[] = result.scored_cards || []
  const topCard = scoredCards[0]
  const totalMonthly: number = result.total_monthly || 0

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:32 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#5A6A85', letterSpacing:'0.08em', marginBottom:6 }}>YOUR PERSONALISED RESULTS</div>
          <h1 style={{ fontSize:'clamp(22px,3.5vw,32px)', fontWeight:800, color:'#0E3785', margin:0 }}>
            Best Cards For Your Spending
          </h1>
          <p style={{ color:'#5A6A85', fontSize:14, margin:'6px 0 0' }}>
            Monthly spend: <strong style={{ color:'#0D1828' }}>{fmtAed(totalMonthly)}</strong>
            {' · '}<strong style={{ color:'#0D1828' }}>{scoredCards.length}</strong> cards analysed
          </p>
        </div>
        <Link href="/analyse" style={{
          padding:'10px 20px', background:'#EEF3FF', borderRadius:8,
          color:'#0E3785', fontSize:14, fontWeight:600, textDecoration:'none',
        }}>← New Analysis</Link>
      </div>

      {/* Current vs Best Card — annual comparison (statement-upload flow only) */}
      {(() => {
        const currentCardId = result.current_card_id
        if (!currentCardId || !topCard) return null
        const currentCard = scoredCards.find(c => c.earnn_card_id === currentCardId)
        if (!currentCard) return null

        const currentName = result.current_card_info?.card_name || currentCard.card_name
        const currentNav  = currentCard.net_annual_value_aed || 0
        const bestNav     = topCard.net_annual_value_aed || 0
        const gap         = bestNav - currentNav

        const isAlreadyBest = currentCard.earnn_card_id === topCard.earnn_card_id

        return (
          <div style={{
            background: isAlreadyBest ? 'linear-gradient(135deg,#00A67E 0%,#00805F 100%)' : 'linear-gradient(135deg,#C0392B 0%,#8B2E2E 100%)',
            borderRadius:20, padding:'24px 36px', marginBottom:24, color:'#fff',
            display:'flex', flexWrap:'wrap', gap:24, alignItems:'center', justifyContent:'space-between',
            boxShadow:'0 10px 36px rgba(14,55,133,0.15)',
          }}>
            <div style={{ flex:1, minWidth:240 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.7)', marginBottom:8 }}>
                {isAlreadyBest ? '✅ YOU\'RE ALREADY ON YOUR BEST CARD' : '⚠️ YOU MAY BE LEAVING MONEY ON THE TABLE'}
              </div>
              {isAlreadyBest ? (
                <div style={{ fontSize:18, fontWeight:700 }}>
                  {currentName} is already the top match for your spending — nice!
                </div>
              ) : (
                <div style={{ fontSize:18, fontWeight:700 }}>
                  Switching from <u>{currentName}</u> to <u>{topCard.card_name}</u> could earn you{' '}
                  <span style={{ color:'#FFD700' }}>{fmtAed(Math.max(gap, 0))} more per year</span>.
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800 }}>{fmtAed(currentNav)}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:3 }}>Your Card — Annual Net Value</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color:'#FFD700' }}>{fmtAed(bestNav)}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', marginTop:3 }}>Best Card — Annual Net Value</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Hero */}
      {topCard && (
        <div style={{
          background:'linear-gradient(135deg,#0E3785 0%,#0A2860 100%)',
          borderRadius:20, padding:'28px 36px', marginBottom:32, color:'#fff',
          display:'flex', flexWrap:'wrap', gap:28, alignItems:'center',
          boxShadow:'0 10px 36px rgba(14,55,133,0.25)',
        }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.55)', marginBottom:8 }}>🏆 YOUR BEST CARD MATCH</div>
            <div style={{ fontSize:22, fontWeight:800 }}>{topCard.card_name}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:4 }}>
              earnn Score: {fmtScore(topCard.earnn_score)} · {topCard.rating_band}
            </div>
          </div>
          <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
            {[
              { label:'Annual Rewards',  value: fmtAed(topCard.expected_annual_return_aed), color:'#00E5B0' },
              { label:'After Fee (NAV)', value: fmtAed(topCard.net_annual_value_aed),       color:'#FFD700' },
              { label:'Annual Fee',      value: topCard.true_annual_fee_aed > 0 ? fmtAed(topCard.true_annual_fee_aed) : 'No Fee', color:'rgba(255,255,255,0.85)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:'2px solid #D6E0F5', marginBottom:28 }}>
        {[
          { key:'ranking', label:'📊 Card Ranking' },
          { key:'wallet',  label:'💳 earnn Wallet' },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); if (tab.key === 'wallet') loadWallet() }}
            style={{
              flex:1, padding:'14px 0', border:'none', background:'none', cursor:'pointer',
              fontSize:15, fontWeight:600, textAlign:'center',
              color: activeTab === tab.key ? '#0E3785' : '#5A6A85',
              borderBottom: activeTab === tab.key ? '3px solid #0E3785' : '3px solid transparent',
              marginBottom:-2,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Tab 1: Card Ranking */}
      {activeTab === 'ranking' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {scoredCards.length === 0
            ? <div style={{ textAlign:'center', padding:60, color:'#5A6A85' }}>No cards found.</div>
            : scoredCards.map((card: any) => <CardTile key={card.earnn_card_id} card={card} />)
          }
        </div>
      )}

      {/* Tab 2: earnn Wallet */}
      {activeTab === 'wallet' && (
        <div>
          {walletLoading && (
            <div style={{ textAlign:'center', padding:'80px 24px' }}>
              <style>{`
                @keyframes cardSpin {
                  0%   { transform: rotateY(0deg) rotate(-8deg); }
                  50%  { transform: rotateY(180deg) rotate(8deg); }
                  100% { transform: rotateY(360deg) rotate(-8deg); }
                }
                @keyframes cardSpin2 {
                  0%   { transform: rotateY(60deg) rotate(6deg); }
                  50%  { transform: rotateY(240deg) rotate(-6deg); }
                  100% { transform: rotateY(420deg) rotate(6deg); }
                }
                @keyframes cardSpin3 {
                  0%   { transform: rotateY(120deg) rotate(-4deg); }
                  50%  { transform: rotateY(300deg) rotate(4deg); }
                  100% { transform: rotateY(480deg) rotate(-4deg); }
                }
                @keyframes pulse {
                  0%, 100% { opacity: 1; }
                  50%       { opacity: 0.5; }
                }
              `}</style>

              {/* Spinning card stack */}
              <div style={{ position:'relative', width:120, height:76, margin:'0 auto 36px', perspective:400 }}>
                {/* Card 3 — back */}
                <div style={{
                  position:'absolute', inset:0, borderRadius:10,
                  background:'linear-gradient(135deg,#1A4FCC,#0E3785)',
                  boxShadow:'0 8px 24px rgba(14,55,133,0.35)',
                  animation:'cardSpin3 1.8s ease-in-out infinite',
                  opacity:0.45,
                }} />
                {/* Card 2 — middle */}
                <div style={{
                  position:'absolute', inset:0, borderRadius:10,
                  background:'linear-gradient(135deg,#2563EB,#0E3785)',
                  boxShadow:'0 8px 24px rgba(14,55,133,0.35)',
                  animation:'cardSpin2 1.8s ease-in-out infinite',
                  opacity:0.7,
                }} />
                {/* Card 1 — front */}
                <div style={{
                  position:'absolute', inset:0, borderRadius:10,
                  background:'linear-gradient(135deg,#3B82F6,#1D4ED8)',
                  boxShadow:'0 8px 32px rgba(14,55,133,0.5)',
                  animation:'cardSpin 1.8s ease-in-out infinite',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <div style={{ width:36, height:6, background:'rgba(255,255,255,0.6)', borderRadius:3 }} />
                </div>
              </div>

              <p style={{ color:'#0E3785', fontSize:17, fontWeight:700, margin:'0 0 8px', animation:'pulse 1.8s ease-in-out infinite' }}>
                Running simulation…
              </p>
              <p style={{ color:'#5A6A85', fontSize:14, margin:0 }}>
                Finding your best card combinations across {' '}
                <strong style={{ color:'#0D1828' }}>thousands of possible wallets</strong>
              </p>
            </div>
          )}
          {walletError && !walletLoading && (
            <div style={{
              background:'#FFF5F5', border:'1px solid #FECACA', borderRadius:12,
              padding:'20px 24px', color:'#C0392B', textAlign:'center',
            }}>
              ⚠️ {walletError}
              <button onClick={loadWallet} style={{
                marginLeft:16, background:'#0E3785', color:'#fff', border:'none',
                borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600,
              }}>Retry</button>
            </div>
          )}
          {walletData && !walletLoading && (
            <div>
              <div style={{ marginBottom:24 }}>
                <h2 style={{ fontSize:20, fontWeight:800, color:'#0D1828', margin:'0 0 8px' }}>earnn Wallet Recommendation</h2>
                <p style={{ color:'#5A6A85', fontSize:14, margin:0 }}>
                  Optimal card combinations for your spending profile, ranked by Net Annual Value. Click any card to see full details.
                </p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
                {(walletData.wallets || []).map((combo: any, i: number) => (
                  <WalletCombo
                    key={i}
                    combo={combo}
                    index={i}
                    cardNames={cardNames}
                    cardData={cardData}
                    topCardNav={topCard?.net_annual_value_aed || 0}
                    onCardClick={openCardDetail}
                    onSeeOthers={() => setComboPopup({ nCards: combo.n_cards, combinations: combo.top_combinations || [] })}
                  />
                ))}
              </div>

              {/* Spend profile used */}
              <div style={{
                marginTop:36, background:'#F8FAFF', borderRadius:16,
                border:'1px solid #D6E0F5', padding:'24px 28px',
              }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#0D1828', marginBottom:16 }}>📋 Your Spending Profile Used</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
                  {Object.entries(walletData.user_spend || {})
                    .filter(([,v]) => (v as number) > 0)
                    .sort(([,a],[,b]) => (b as number) - (a as number))
                    .map(([k,v]: any) => (
                      <div key={k} style={{
                        background:'#fff', borderRadius:10, border:'1px solid #D6E0F5', padding:'12px 16px', textAlign:'center',
                      }}>
                        <div style={{ fontSize:22, marginBottom:4 }}>{CAT_ICONS[k] || '💳'}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:'#0E3785' }}>{fmtAed(v)}</div>
                        <div style={{ fontSize:11, color:'#5A6A85', marginTop:2, textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div style={{ marginTop:48, padding:'28px 32px', background:'#EEF3FF', borderRadius:16, textAlign:'center' }}>
        <h3 style={{ fontSize:18, fontWeight:700, color:'#0E3785', margin:'0 0 8px' }}>Have questions about these cards?</h3>
        <p style={{ color:'#5A6A85', fontSize:14, margin:'0 0 18px' }}>
          Ask earnn anything — lounge access, fee waivers, earn rates for specific merchants.
        </p>
        <Link href="/chat" style={{
          background:'#0E3785', color:'#fff', padding:'13px 32px',
          borderRadius:8, textDecoration:'none', fontWeight:700, fontSize:15,
        }}>💬 Ask earnn →</Link>
      </div>

      {/* Card Detail Popup */}
      {detailPopup && (
        <CardDetailPopup
          cardId={detailPopup.cardId}
          cardName={detailPopup.cardName}
          cardEarnn={detailPopup.earnn}
          cardFee={detailPopup.fee}
          prefetchedDetail={detailCache[detailPopup.cardId] || undefined}
          onClose={() => setDetailPopup(null)}
        />
      )}

      {/* Other Combinations Popup */}
      {comboPopup && (
        <OtherCombosPopup
          nCards={comboPopup.nCards}
          combinations={comboPopup.combinations}
          cardNames={cardNames}
          cardData={cardData}
          onCardClick={(id, name) => {
            const cd = cardData[id]
            setDetailPopup({ cardId: id, cardName: name, earnn: cd?.expected_annual_return_aed, fee: cd?.true_annual_fee_aed })
          }}
          onClose={() => setComboPopup(null)}
        />
      )}
    </div>
  )
}
