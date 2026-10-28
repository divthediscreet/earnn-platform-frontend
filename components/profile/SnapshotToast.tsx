'use client'

// A short, non-blocking note that says which saved details a page is calculating with.
// The page decides when to show it (once per visit); this only renders and times itself out.
import { useEffect, useState } from 'react'
import { groupShort } from '@/lib/wallet-simulator/groups'
import type { SavedProfileView } from '@/lib/profile/useSavedProfile'

const SHOW_MS = 3000
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`

export default function SnapshotToast({ profile, onEdit, onDone, onConfirm }: {
  profile: SavedProfileView
  onEdit: () => void
  onDone: () => void
  /** When set, the snapshot waits for an answer instead of timing out (Simulate: "use this spending?"). */
  onConfirm?: () => void
}) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || onConfirm) return
    const timer = setTimeout(onDone, SHOW_MS)
    return () => clearTimeout(timer)
  }, [paused, onDone, onConfirm])

  if (!profile.spend) return null
  const top = Object.entries(profile.spend).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const body = (
    <div role={onConfirm ? 'dialog' : 'status'} aria-live="polite"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      style={{ ...(onConfirm ? { position: 'relative' } : { position: 'fixed', top: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 1300 }), width: 'min(380px, calc(100vw - 32px))',
        background: '#0D1828', color: 'white', borderRadius: 14, padding: '12px 14px', boxShadow: '0 14px 40px rgba(13,24,40,0.35)', fontSize: 13 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{onConfirm ? 'Use the spending you saved earlier?' : 'Using the spending you saved earlier'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 14px', color: '#C9D4EC' }}>
        {top.map(([key, value]) => (
          <div key={key} style={{ display: 'contents' }}><span>{groupShort(key)}</span><span style={{ textAlign: 'right' }}>{aed(value)}</span></div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)', fontWeight: 700 }}>
        <span>Total {aed(profile.totalMonthly)} / mo</span>
        <span>{profile.salary ? `Salary ${aed(Number(profile.salary))}` : 'Salary not saved'}</span>
      </div>
      {(profile.ownedCardIds.length > 0 || profile.paymentCount > 0) && (
        <div style={{ marginTop: 4, color: '#C9D4EC', fontSize: 12 }}>
          {[profile.ownedCardIds.length > 0 && `${profile.ownedCardIds.length} card${profile.ownedCardIds.length > 1 ? 's' : ''} you own`,
            profile.paymentCount > 0 && `${profile.paymentCount} big payment${profile.paymentCount > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
        </div>
      )}
      {onConfirm ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onConfirm} style={{ flex: 1, border: 0, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, background: '#F7C948', color: '#0A2860', fontWeight: 800, fontSize: 13.5 }}>Yes, use this</button>
          <button type="button" onClick={onEdit} style={{ flex: 1, cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: 'white', fontWeight: 800, fontSize: 13.5 }}>Change it</button>
        </div>
      ) : (
        <div style={{ marginTop: 6, fontSize: 12, color: '#9FB0D3' }}>
          You can change this anytime.{' '}
          <button type="button" onClick={onEdit} style={{ padding: 0, border: 0, background: 'none', color: '#F7C948', fontWeight: 800, cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>Edit</button>
        </div>
      )}
    </div>
  )
  if (!onConfirm) return body
  return <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}>{body}</div>
}
