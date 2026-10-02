'use client'

import { getCardImageUrl } from '@/lib/api'

// Kept at module level so the browser holds the decoded images between page visits.
const preloaded = new Map<string, HTMLImageElement>()
let idsPromise: Promise<string[]> | null = null

/** Card ids for the holding screen. Fetched once per page load and shared. */
export function loadCardIds(): Promise<string[]> {
  if (!idsPromise) {
    idsPromise = fetch('/api/cards?limit=16&sort_by=card_ranking')
      .then(r => r.json())
      .then(d => ((d.cards || []) as { earnn_card_id: string }[]).map(c => c.earnn_card_id))
      .catch(() => { idsPromise = null; return [] as string[] })
  }
  return idsPromise
}

/** Starts downloading (and decoding) the card images now, so the holding screen shows them instantly. */
export function preloadCardImages(ids: string[]) {
  for (const id of ids) {
    if (preloaded.has(id)) continue
    const img = new Image()
    img.decoding = 'async'
    img.src = getCardImageUrl(id)
    img.decode?.().catch(() => {})
    preloaded.set(id, img)
  }
}

const COL_DIR = ['dn', 'up', 'dn', 'up'] as const
const COL_SPEED = [11, 13, 9, 15] // seconds per loop, varied so the columns drift apart

/** Full-screen holding screen while the simulator works: real card images scrolling in four columns
 *  (the same animation as the Analyse page, without the floating spend chips). */
export function CardColumnsLoader({ cardIds, title, subtitle }: { cardIds: string[]; title: string; subtitle: string }) {
  // 16 cards -> 4 columns of 4 (padded with the placeholder), each tripled for a seamless loop
  const columns = [0, 1, 2, 3].map(col => {
    const slice = cardIds.slice(col * 4, col * 4 + 4)
    while (slice.length < 4) slice.push('__dummy__')
    return [...slice, ...slice, ...slice]
  })
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#07112B', display: 'flex', overflow: 'hidden' }}>
      {columns.map((cards, col) => (
        <div key={col} style={{ flex: 1, overflow: 'hidden', position: 'relative', opacity: 0.72 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, zIndex: 2, background: 'linear-gradient(to bottom, #07112B, transparent)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, zIndex: 2, background: 'linear-gradient(to top, #07112B, transparent)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 6px', animation: `simCardCol${COL_DIR[col]} ${COL_SPEED[col]}s linear infinite` }}>
            {cards.map((id, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} alt=""
                src={id === '__dummy__' ? '/card-dummy.svg' : getCardImageUrl(id)}
                onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
                style={{ width: '100%', height: 'auto', aspectRatio: '1.586', borderRadius: 8, objectFit: 'cover', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', display: 'block', flexShrink: 0 }} />
            ))}
          </div>
        </div>
      ))}

      <div style={{
        position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse 55% 38% at 50% 50%, rgba(7,17,43,0.92) 60%, transparent 100%)', pointerEvents: 'none', padding: 24,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#4A8EFF', animation: 'simSpin 0.9s linear infinite', marginBottom: 22 }} />
        <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '-0.3px', lineHeight: 1.35 }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: '0.02em', maxWidth: 420 }}>{subtitle}</div>
      </div>

      <style>{`
        @keyframes simCardColdn { from { transform: translateY(-33.33%); } to { transform: translateY(0%); } }
        @keyframes simCardColup { from { transform: translateY(0%); } to { transform: translateY(-33.33%); } }
        @keyframes simSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
