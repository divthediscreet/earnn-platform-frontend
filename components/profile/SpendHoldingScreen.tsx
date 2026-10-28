'use client'

// The one holding screen for the card lists: a big snapshot of the spending being used, shown until the results are ready.
// It replaces the old "Fetching all UAE cards" loader. Before the saved spending has been read it shows only the heading.
import { groupShort } from '@/lib/wallet-simulator/groups'

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`

export default function SpendHoldingScreen({ amounts, salary, ownedCount = 0, title = 'Getting your cards ready', subtitle }: {
  amounts: Record<string, number> | null
  salary?: string
  ownedCount?: number
  title?: string
  subtitle?: string
}) {
  const rows = Object.entries(amounts ?? {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const top = rows.slice(0, 5)
  const total = rows.reduce((sum, [, v]) => sum + v, 0)
  const max = top[0]?.[1] ?? 1

  return (
    <div role="status" aria-live="polite" style={{ minHeight: '78vh', display: 'grid', placeItems: 'center', padding: '40px 20px' }}>
      <style>{`
        @keyframes hsSpin { 0% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
        @keyframes hsBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes hsDot { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
        .hs-card0 { animation: hsSpin 1.4s ease-in-out infinite 0s; }
        .hs-card1 { animation: hsSpin 1.4s ease-in-out infinite .28s; }
        .hs-card2 { animation: hsSpin 1.4s ease-in-out infinite .56s; }
        .hs-bar { transform-origin: left; animation: hsBar .7s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .hs-card0, .hs-card1, .hs-card2, .hs-bar { animation: none !important; } }
      `}</style>
      <div style={{ width: '100%', maxWidth: 760, borderRadius: 28, overflow: 'hidden', boxShadow: '0 30px 70px -24px rgba(10,42,102,.5)', background: '#fff', border: '1px solid #D6E0F5' }}>
        <div style={{ padding: '30px 34px 26px', color: '#fff', background: 'radial-gradient(120% 140% at 0% 0%, #1A4FAD 0%, #0E3785 45%, #0A2A66 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10, perspective: 400 }} aria-hidden>
              {['#4ee0b2', '#FFD76A', '#ffffff'].map((bg, i) => <div key={i} className={`hs-card${i}`} style={{ width: 40, height: 26, borderRadius: 6, background: bg, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }} />)}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15 }}>{title}</div>
              <div style={{ marginTop: 4, fontSize: 14.5, color: '#c9d8f5' }}>
                {amounts && rows.length > 0 ? (subtitle ?? 'Testing every UAE card on the spending below') : 'Loading every UAE card'}
                <span aria-hidden>{[0, 1, 2].map(i => <span key={i} style={{ animation: `hsDot 1.2s ${i * 0.2}s infinite` }}>.</span>)}</span>
              </div>
            </div>
          </div>
        </div>

        {top.length > 0 && (
          <div style={{ padding: '24px 34px 8px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#5A6A85', marginBottom: 14 }}>Your monthly spending</div>
            <div style={{ display: 'grid', gap: 11 }}>
              {top.map(([key, value], i) => (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px, 150px) 1fr 104px', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#0D1828' }}>{groupShort(key)}</span>
                  <span style={{ height: 10, borderRadius: 999, background: '#E8EEFB', overflow: 'hidden' }}>
                    <span className="hs-bar" style={{ display: 'block', height: '100%', width: `${Math.max(6, (value / max) * 100)}%`, borderRadius: 999, background: 'linear-gradient(90deg,#0E3785,#3B7BE0)', animationDelay: `${i * 0.08}s` }} />
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: '#0A2A66', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{aed(value)}</span>
                </div>
              ))}
              {rows.length > top.length && <div style={{ fontSize: 12.5, color: '#7A8BA8' }}>+ {rows.length - top.length} more {rows.length - top.length === 1 ? 'category' : 'categories'}</div>}
            </div>
          </div>
        )}

        {top.length > 0 && (
          <div style={{ margin: '18px 34px 0', padding: '16px 0 0', borderTop: '1px solid #E3EAF7', display: 'flex', flexWrap: 'wrap', gap: '10px 30px' }}>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A85' }}>Total spend</div><div style={{ fontSize: 22, fontWeight: 800, color: '#0A2A66' }}>{aed(total)} <span style={{ fontSize: 13, fontWeight: 600, color: '#7A8BA8' }}>/ month</span></div></div>
            {salary && Number(salary) > 0 && <div><div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A85' }}>Salary</div><div style={{ fontSize: 22, fontWeight: 800, color: '#0A2A66' }}>{aed(Number(salary))}</div></div>}
            {ownedCount > 0 && <div><div style={{ fontSize: 12, fontWeight: 700, color: '#5A6A85' }}>Cards you own</div><div style={{ fontSize: 22, fontWeight: 800, color: '#0A2A66' }}>{ownedCount}</div></div>}
          </div>
        )}

        <div style={{ padding: '18px 34px 26px', fontSize: 13.5, color: '#5A6A85' }}>
          {top.length > 0 ? 'You can change your spending any time once you are in.' : 'This only takes a moment.'}
        </div>
      </div>
    </div>
  )
}
